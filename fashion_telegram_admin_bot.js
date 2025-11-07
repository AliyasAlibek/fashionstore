/**
 * Telegram Admin Bot для Fashion Store
 * 
 * УСТАНОВКА:
 * 1. npm install node-telegram-bot-api
 * 2. Создай бота @BotFather -> получи TOKEN
 * 3. В .env.local добавь:
 *    TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklmnoPQRstuvWXYZ
 *    TELEGRAM_ADMIN_ID=123456789
 * 4. Запусти: node telegram-admin-bot.js (в отдельном окне или как сервис)
 */

const TelegramBot = require('node-telegram-bot-api');
const { getSupabase } = require('./lib/supabase');

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminId = process.env.TELEGRAM_ADMIN_ID;

if (!token || !adminId) {
  console.error('❌ Установи TELEGRAM_BOT_TOKEN и TELEGRAM_ADMIN_ID в .env.local');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const supabase = getSupabase();

const statusEmoji = {
  'new': '🆕',
  'confirmed': '✅',
  'delivered': '🚚',
  'cancelled': '❌'
};

const statusText = {
  'new': 'Новый заказ',
  'confirmed': 'Подтвержден',
  'delivered': 'Доставлен',
  'cancelled': 'Отменен'
};

// Кеш заказов для быстрого доступа
let orderCache = {};

// Загрузи заказы при старте
async function loadOrders() {
  if (!supabase) return;
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      data.forEach(order => {
        orderCache[order.id] = order;
      });
      console.log('✅ Загружено заказов:', data.length);
    }
  } catch (e) {
    console.error('❌ Ошибка загрузки:', e);
  }
}

// Вывод списка заказов
async function showOrdersList(chatId, filter = 'all') {
  try {
    let orders = Object.values(orderCache);
    
    if (filter !== 'all') {
      orders = orders.filter(o => o.status === filter);
    }
    
    if (orders.length === 0) {
      bot.sendMessage(chatId, `📭 Заказов не найдено (фильтр: ${filter})`);
      return;
    }

    // Отправляем первые 10 заказов
    const displayOrders = orders.slice(0, 10);
    
    let text = `📋 *Заказы* (${orders.length} всего)\n\n`;
    
    displayOrders.forEach((order, idx) => {
      const items = order.items?.length || 0;
      text += `${idx + 1}. #${order.id} - ${order.customer_name}\n`;
      text += `   📦 ${items} товаров | 💰 ${order.total.toLocaleString()}₸\n`;
      text += `   ${statusEmoji[order.status]} ${statusText[order.status]}\n`;
      text += `   📞 ${order.customer_phone}\n\n`;
    });

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🆕 Новые', callback_data: 'filter_new' },
          { text: '✅ Подтвержденные', callback_data: 'filter_confirmed' }
        ],
        [
          { text: '🚚 Доставленные', callback_data: 'filter_delivered' },
          { text: '❌ Отменённые', callback_data: 'filter_cancelled' }
        ],
        [
          { text: '📋 Все', callback_data: 'filter_all' },
          { text: '🔄 Обновить', callback_data: 'refresh' }
        ]
      ]
    };

    bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    bot.sendMessage(chatId, '❌ Ошибка загрузки заказов');
  }
}

// Вывод детали заказа
async function showOrderDetail(chatId, orderId) {
  const order = orderCache[orderId];
  
  if (!order) {
    bot.sendMessage(chatId, '❌ Заказ не найден');
    return;
  }

  let text = `📦 *Заказ #${order.id}*\n\n`;
  text += `👤 *Клиент:* ${order.customer_name}\n`;
  text += `📱 *Телефон:* ${order.customer_phone}\n`;
  text += `📍 *Адрес:* ${order.customer_address}\n`;
  
  if (order.customer_comment) {
    text += `💬 *Комментарий:* ${order.customer_comment}\n`;
  }

  text += `\n📦 *Товары:*\n`;
  order.items?.forEach((item, idx) => {
    text += `${idx + 1}. ${item.name}\n`;
    text += `   Размер: ${item.selectedSize} | Цвет: ${item.selectedColor.name}\n`;
    text += `   ${item.price.toLocaleString()}₸\n`;
  });

  text += `\n💰 *Итого:* ${order.total.toLocaleString()}₸\n`;
  text += `${statusEmoji[order.status]} *Статус:* ${statusText[order.status]}\n`;
  text += `📅 ${new Date(order.created_at).toLocaleString('ru-RU')}\n`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Подтвердить', callback_data: `status_${orderId}_confirmed` },
        { text: '🚚 Доставлен', callback_data: `status_${orderId}_delivered` }
      ],
      [
        { text: '❌ Отменить', callback_data: `status_${orderId}_cancelled` },
        { text: '🗑️ Удалить', callback_data: `delete_${orderId}` }
      ],
      [
        { text: '◀️ Назад', callback_data: 'filter_all' }
      ]
    ]
  };

  bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

// Изменение статуса
async function updateOrderStatus(orderId, newStatus) {
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    orderCache[orderId] = data;
    console.log(`✅ Заказ #${orderId} → ${newStatus}`);
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка обновления:', error);
    return false;
  }
}

// Удаление заказа
async function deleteOrder(orderId) {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;

    delete orderCache[orderId];
    console.log(`✅ Заказ #${orderId} удалён`);
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления:', error);
    return false;
  }
}

// КОМАНДЫ
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  if (chatId.toString() !== adminId) {
    bot.sendMessage(chatId, '❌ У вас нет доступа');
    return;
  }

  const keyboard = {
    inline_keyboard: [
      [{ text: '📋 Заказы', callback_data: 'filter_all' }],
      [{ text: '🆕 Новые', callback_data: 'filter_new' }],
      [{ text: '📊 Статистика', callback_data: 'stats' }]
    ]
  };

  bot.sendMessage(chatId, `
👋 *Добро пожаловать в админку Fashion Store!*

📊 *Возможности:*
• Просмотр всех заказов
• Изменение статуса
• Удаление заказов
• Статистика

/orders - Все заказы
/new - Только новые
/stats - Статистика
  `, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
});

bot.onText(/\/orders/, (msg) => {
  if (msg.chat.id.toString() !== adminId) {
    bot.sendMessage(msg.chat.id, '❌ Нет доступа');
    return;
  }
  showOrdersList(msg.chat.id, 'all');
});

bot.onText(/\/new/, (msg) => {
  if (msg.chat.id.toString() !== adminId) {
    bot.sendMessage(msg.chat.id, '❌ Нет доступа');
    return;
  }
  showOrdersList(msg.chat.id, 'new');
});

bot.onText(/\/stats/, (msg) => {
  if (msg.chat.id.toString() !== adminId) {
    bot.sendMessage(msg.chat.id, '❌ Нет доступа');
    return;
  }

  const orders = Object.values(orderCache);
  const newCount = orders.filter(o => o.status === 'new').length;
  const confirmedCount = orders.filter(o => o.status === 'confirmed').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const totalSum = orders.reduce((sum, o) => sum + o.total, 0);

  const text = `
📊 *СТАТИСТИКА*

📋 Всего заказов: ${orders.length}
🆕 Новых: ${newCount}
✅ Подтвержденных: ${confirmedCount}
🚚 Доставленных: ${deliveredCount}

💰 Общая сумма: ${totalSum.toLocaleString()}₸

📈 Средний заказ: ${orders.length > 0 ? Math.round(totalSum / orders.length).toLocaleString() : 0}₸
  `;

  bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

// CALLBACKS
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (chatId.toString() !== adminId) {
    bot.answerCallbackQuery(query.id, '❌ Нет доступа', true);
    return;
  }

  // Фильтры
  if (data.startsWith('filter_')) {
    const filter = data.replace('filter_', '');
    bot.editMessageText(
      '⏳ Загрузка...',
      { chat_id: chatId, message_id: query.message.message_id }
    );
    
    setTimeout(() => showOrdersList(chatId, filter), 500);
    bot.answerCallbackQuery(query.id);
    return;
  }

  // Просмотр заказа
  if (data.startsWith('order_')) {
    const orderId = parseInt(data.replace('order_', ''));
    bot.deleteMessage(chatId, query.message.message_id);
    showOrderDetail(chatId, orderId);
    bot.answerCallbackQuery(query.id);
    return;
  }

  // Изменение статуса
  if (data.startsWith('status_')) {
    const [_, orderId, status] = data.split('_');
    const success = await updateOrderStatus(parseInt(orderId), status);
    
    if (success) {
      bot.answerCallbackQuery(query.id, `✅ Статус изменён на ${statusText[status]}`, true);
      showOrderDetail(chatId, parseInt(orderId));
    } else {
      bot.answerCallbackQuery(query.id, '❌ Ошибка обновления', true);
    }
    return;
  }

  // Удаление
  if (data.startsWith('delete_')) {
    const orderId = parseInt(data.replace('delete_', ''));
    const success = await deleteOrder(orderId);
    
    if (success) {
      bot.answerCallbackQuery(query.id, '✅ Заказ удалён', true);
      bot.deleteMessage(chatId, query.message.message_id);
      showOrdersList(chatId, 'all');
    } else {
      bot.answerCallbackQuery(query.id, '❌ Ошибка удаления', true);
    }
    return;
  }

  // Статистика
  if (data === 'stats') {
    bot.deleteMessage(chatId, query.message.message_id);
    
    const orders = Object.values(orderCache);
    const newCount = orders.filter(o => o.status === 'new').length;
    const confirmedCount = orders.filter(o => o.status === 'confirmed').length;
    const deliveredCount = orders.filter(o => o.status === 'delivered').length;
    const totalSum = orders.reduce((sum, o) => sum + o.total, 0);

    const text = `
📊 *СТАТИСТИКА*

📋 Всего заказов: ${orders.length}
🆕 Новых: ${newCount}
✅ Подтвержденных: ${confirmedCount}
🚚 Доставленных: ${deliveredCount}

💰 Общая сумма: ${totalSum.toLocaleString()}₸
📈 Средний заказ: ${orders.length > 0 ? Math.round(totalSum / orders.length).toLocaleString() : 0}₸
    `;

    const keyboard = {
      inline_keyboard: [
        [{ text: '◀️ Назад', callback_data: 'filter_all' }]
      ]
    };

    bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
    bot.answerCallbackQuery(query.id);
    return;
  }

  // Refresh
  if (data === 'refresh') {
    await loadOrders();
    bot.answerCallbackQuery(query.id, '🔄 Обновлено', true);
    showOrdersList(chatId, 'all');
  }
});

// Обработка нового заказа
async function notifyNewOrder(order) {
  if (!supabase) return;

  orderCache[order.id] = order;

  const text = `
🆕 *НОВЫЙ ЗАКАЗ #${order.id}*

👤 ${order.customer_name}
📱 ${order.customer_phone}
📍 ${order.customer_address}

📦 Товаров: ${order.items?.length || 0}
💰 Сумма: ${order.total.toLocaleString()}₸

${order.customer_comment ? `💬 ${order.customer_comment}` : ''}
  `;

  const keyboard = {
    inline_keyboard: [
      [{ text: '📋 Открыть', callback_data: `order_${order.id}` }],
      [{ text: '✅ Подтвердить', callback_data: `status_${order.id}_confirmed` }]
    ]
  };

  bot.sendMessage(adminId, text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

// Старт бота
console.log('🤖 Telegram админка запущена');
console.log('💡 Команды: /start, /orders, /new, /stats');

loadOrders();

// Экспорт для использования в API
module.exports = { notifyNewOrder, updateOrderStatus, deleteOrder };