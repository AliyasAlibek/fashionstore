import { getSupabase } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не допускается' });
  }

  try {
    const { customer, items, total } = req.body;

    // Валидация
    if (!customer?.name || !customer?.phone || !customer?.address) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста' });
    }

    if (total <= 0) {
      return res.status(400).json({ error: 'Некорректная сумма' });
    }

    const supabase = getSupabase();
    let orderId = null;
    let savedToDb = false;

    // 📦 Сохраняем в Supabase (если настроен)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .insert({
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_address: customer.address,
            customer_comment: customer.comment || '',
            items: items, // JSONB автоматически сериализуется
            total: total,
            status: 'new',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Ошибка Supabase:', error);
        } else if (data) {
          orderId = data.id;
          savedToDb = true;
          console.log('✅ Заказ сохранён в БД:', orderId);
        }
      } catch (dbError) {
        console.error('❌ Критическая ошибка БД:', dbError);
      }
    } else {
      console.warn('⚠️ Supabase не настроен');
    }

    // 📱 Отправляем в Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    let sentToTelegram = false;

    if (botToken && chatId) {
      try {
        const itemsList = items
          .map((item, i) => 
            `${i + 1}. ${item.name}\n` +
            `   Размер: ${item.selectedSize} | Цвет: ${item.selectedColor.name}\n` +
            `   Цена: ${item.price.toLocaleString()} ₸`
          )
          .join('\n\n');

        const orderText = `
🆕 *Новый заказ*${orderId ? ` #${orderId}` : ''}!

👤 *Клиент:* ${customer.name}
📱 *Телефон:* ${customer.phone}
📍 *Адрес:* ${customer.address}
${customer.comment ? `💬 *Комментарий:* ${customer.comment}` : ''}

📦 *Товары:*
${itemsList}

💰 *Итого:* ${total.toLocaleString()} ₸

${savedToDb ? `✅ Сохранено в БД` : '⚠️ БД не подключена'}
${new Date().toLocaleString('ru-RU')}
        `.trim();

        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: orderText,
              parse_mode: 'Markdown'
            })
          }
        );

        if (telegramResponse.ok) {
          sentToTelegram = true;
          console.log('✅ Отправлено в Telegram');
        } else {
          const tgError = await telegramResponse.text();
          console.error('❌ Ошибка Telegram:', tgError);
        }
      } catch (tgError) {
        console.error('❌ Ошибка отправки в Telegram:', tgError);
      }
    } else {
      console.warn('⚠️ Telegram не настроен (TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID)');
    }

    // ✅ РЕЗУЛЬТАТ
    // Успех, если либо в БД, либо в Telegram
    if (savedToDb || sentToTelegram) {
      return res.status(200).json({
        success: true,
        message: 'Заказ принят',
        orderId: orderId || null,
        savedToDatabase: savedToDb,
        sentToTelegram: sentToTelegram
      });
    }

    // Ошибка, если ничего не сработало
    return res.status(500).json({
      error: 'Ошибка: заказ не отправлен ни в Telegram, ни в БД',
      debug: {
        telegramConfigured: !!botToken && !!chatId,
        databaseConfigured: !!supabase
      }
    });

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    return res.status(500).json({
      error: 'Ошибка сервера',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
