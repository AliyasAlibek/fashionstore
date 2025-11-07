import { useState, useEffect } from 'react';
import Head from 'next/head';
import { CATEGORIES, PRODUCTS, LANG } from '../data';

export default function Home() {
  const [view, setView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [lang, setLang] = useState('ru');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const t = LANG[lang];

  // 💾 Загружаем корзину из localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Ошибка при загрузке корзины:', e);
      }
    }
  }, []);

  // 💾 Сохраняем корзину в localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.headerColor = '#FFFFFF';
    }
  }, []);

  const showMessage = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const addToCart = () => {
    if (!selectedSize || !selectedColor) {
      showMessage(t.selectSizeColor, 'error');
      return;
    }

    const item = {
      ...selectedProduct,
      selectedSize,
      selectedColor,
      cartId: Date.now()
    };
    setCart([...cart, item]);
    showMessage('✓ Добавлено в корзину', 'success');
    setTimeout(() => setView('cart'), 1000);
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price, 0);
  };

  // 📱 ГЛАВНАЯ
  const HomeView = () => (
    <div className="pb-24">
      <div className="p-4">
        <div className="mb-6">
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, marginBottom: '8px' }}>
            👗 Fashion Store
          </h1>
          <p style={{ color: '#9ca3af', margin: 0, fontSize: '14px' }}>
            Новые коллекции каждый день
          </p>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', margin: 0 }}>
          {t.categories}
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {CATEGORIES.map(category => (
            <div 
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                setView('catalog');
              }}
              className="ploom-card"
              style={{ cursor: 'pointer' }}
            >
              <img 
                src={category.image} 
                alt={t[category.id] || category.name}
                className="category-image"
              />
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>{t[category.id] || category.name}</span>
                <span style={{ color: '#9ca3af' }}>→</span>
              </div>
              {category.badge && (
                <div className="discount-badge">
                  {category.badge}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 📦 КАТАЛОГ
  const CatalogView = () => {
    const filteredProducts = PRODUCTS.filter(p => p.category === selectedCategory);
    
    return (
      <div className="pb-24">
        <div className="p-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button 
              onClick={() => setView('home')} 
              style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: 0 }}
            >
              ←
            </button>
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
              {t.catalog}
            </h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {filteredProducts.map(product => (
              <div 
                key={product.id}
                onClick={() => {
                  setSelectedProduct(product);
                  setSelectedSize(null);
                  setSelectedColor(null);
                  setCurrentImageIndex(0);
                  setView('product');
                }}
                className="ploom-card"
                style={{ cursor: 'pointer' }}
              >
                <img 
                  src={product.images[0]} 
                  alt={product.name}
                  className="product-image"
                />
                <div style={{ padding: '12px' }}>
                  <h3 style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', margin: 0, lineHeight: 1.3 }}>
                    {product.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>
                      {product.price.toLocaleString()} ₸
                    </span>
                    {product.oldPrice && (
                      <span style={{ fontSize: '11px', color: '#9ca3af', textDecoration: 'line-through' }}>
                        {product.oldPrice.toLocaleString()} ₸
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 🔍 ТОВАР
  const ProductView = () => {
    if (!selectedProduct) return null;

    const handleSwipe = (e) => {
      const scrollLeft = e.target.scrollLeft;
      const imageWidth = e.target.offsetWidth;
      const newIndex = Math.round(scrollLeft / imageWidth);
      setCurrentImageIndex(newIndex);
    };

    return (
      <div className="pb-28">
        <div className="p-4">
          <button 
            onClick={() => setView('catalog')} 
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: 0 }}
          >
            ←
          </button>
        </div>

        {/* СВАЙПЕР */}
        <div style={{ position: 'relative', marginBottom: '16px', marginTop: '-8px' }}>
          <div 
            className="image-swiper"
            onScroll={handleSwipe}
          >
            {selectedProduct.images.map((img, idx) => (
              <div key={idx} style={{ minWidth: '100%', scrollSnapAlign: 'start' }}>
                <img 
                  src={img} 
                  alt={selectedProduct.name}
                  style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ))}
          </div>
          
          {/* ИНДИКАТОРЫ */}
          <div style={{ position: 'absolute', bottom: '12px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px' }}>
            {selectedProduct.images.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: idx === currentImageIndex ? '28px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: idx === currentImageIndex ? 'white' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.4s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              />
            ))}
          </div>
        </div>

        <div className="p-4">
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px', margin: 0 }}>
            {selectedProduct.name}
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontSize: '26px', fontWeight: 700 }}>
              {selectedProduct.price.toLocaleString()} ₸
            </span>
            {selectedProduct.oldPrice && (
              <span style={{ fontSize: '16px', color: '#9ca3af', textDecoration: 'line-through' }}>
                {selectedProduct.oldPrice.toLocaleString()} ₸
              </span>
            )}
          </div>

          {/* РАЗМЕРЫ */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '12px', fontSize: '15px', margin: 0 }}>{t.size}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedProduct.sizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`size-button ${selectedSize === size ? 'selected' : ''}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* ЦВЕТА */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '12px', fontSize: '15px', margin: 0 }}>{t.color}</h3>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
              {selectedProduct.colors.map(color => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color)}
                  className={`color-button ${selectedColor?.name === color.name ? 'selected' : ''}`}
                  style={{ 
                    backgroundColor: color.hex,
                    border: color.hex === '#FFFFFF' ? '2px solid #e5e7eb' : undefined
                  }}
                />
              ))}
            </div>
            {selectedColor && (
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{selectedColor.name}</p>
            )}
          </div>

          {/* ОПИСАНИЕ */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '8px', fontSize: '15px', margin: 0 }}>{t.description}</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
              {selectedProduct.description}
            </p>
          </div>

          <button
            onClick={addToCart}
            className="fixed-bottom-button"
          >
            {t.addToCart}
          </button>
        </div>
      </div>
    );
  };

  // 🛒 КОРЗИНА
  const CartView = () => {
    if (cart.length === 0) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛒</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', margin: 0 }}>
            {t.cartEmpty}
          </h2>
          <p style={{ color: '#9ca3af', marginBottom: '20px', margin: 0 }}>Начните с выбора товара</p>
          <button
            onClick={() => setView('home')}
            className="btn-primary"
          >
            {t.goShopping}
          </button>
        </div>
      );
    }

    return (
      <div style={{ paddingBottom: '160px' }}>
        <div className="p-4">
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px', margin: 0 }}>
            {t.cart}
          </h2>
          
          {cart.map((item) => (
            <div key={item.cartId} className="cart-item">
              <img 
                src={item.images[0]} 
                alt={item.name}
              />
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 600, marginBottom: '4px', margin: 0, fontSize: '15px' }}>
                  {item.name}
                </h3>
                <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>
                  <div>{t.size}: {item.selectedSize}</div>
                  <div>{t.color}: {item.selectedColor.name}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>
                  {item.price.toLocaleString()} ₸
                </div>
              </div>
              <button
                onClick={() => removeFromCart(item.cartId)}
                className="btn-delete"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        {/* ИТОГО */}
        <div style={{ position: 'fixed', bottom: '64px', left: 0, right: 0, background: 'white', borderTop: '1px solid #e5e7eb', padding: '16px', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', maxWidth: '500px', margin: '0 auto' }}>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>{t.total}:</span>
            <span style={{ fontSize: '22px', fontWeight: 700 }}>
              {getTotalPrice().toLocaleString()} ₸
            </span>
          </div>
          <button
            onClick={() => setView('checkout')}
            className="fixed-bottom-button"
            style={{ bottom: '80px', position: 'relative', margin: 0 }}
          >
            {t.checkout}
          </button>
        </div>
      </div>
    );
  };

  // 💳 ОФОРМЛЕНИЕ
  const CheckoutView = () => {
    const [form, setForm] = useState({
      name: '',
      phone: '',
      address: '',
      comment: ''
    });

    const [errors, setErrors] = useState({});

    const validateForm = () => {
      const newErrors = {};
      
      if (!form.name.trim()) newErrors.name = 'Введите имя';
      if (!form.phone.trim()) newErrors.phone = 'Введите телефон';
      if (!/^\+?[0-9\s\-\(\)]{10,}$/.test(form.phone)) {
        newErrors.phone = 'Некорректный номер телефона';
      }
      if (!form.address.trim()) newErrors.address = 'Введите адрес';
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
      if (!validateForm()) {
        showMessage('Проверьте форму', 'error');
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer: form,
            items: cart,
            total: getTotalPrice()
          })
        });

        const data = await response.json();

        if (response.ok) {
          showMessage('✓ Заказ оформлен! Мы свяжемся с вами', 'success');
          setCart([]);
          localStorage.removeItem('cart');
          setTimeout(() => setView('home'), 2000);
        } else {
          showMessage(data.error || 'Ошибка при оформлении', 'error');
        }
      } catch (error) {
        showMessage('Ошибка сети. Попробуйте снова', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="pb-32">
        <div className="p-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button 
              onClick={() => setView('cart')} 
              style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: 0 }}
            >
              ←
            </button>
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Оформление заказа</h2>
          </div>

          {message && (
            <div className={`${message.type}-message`} style={{ marginBottom: '16px' }}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* ИМЯ */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                Имя *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                placeholder="Ваше имя"
                disabled={isLoading}
                style={{ borderColor: errors.name ? '#ef4444' : undefined }}
              />
              {errors.name && <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0 0' }}>{errors.name}</p>}
            </div>

            {/* ТЕЛЕФОН */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                Телефон *
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({...form, phone: e.target.value})}
                placeholder="+7 (___) ___-__-__"
                disabled={isLoading}
                style={{ borderColor: errors.phone ? '#ef4444' : undefined }}
              />
              {errors.phone && <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0 0' }}>{errors.phone}</p>}
            </div>

            {/* АДРЕС */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                Адрес доставки *
              </label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({...form, address: e.target.value})}
                placeholder="Город, улица, дом, квартира"
                rows="3"
                disabled={isLoading}
                style={{ borderColor: errors.address ? '#ef4444' : undefined }}
              />
              {errors.address && <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0 0' }}>{errors.address}</p>}
            </div>

            {/* КОММЕНТАРИЙ */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                Комментарий (опционально)
              </label>
              <textarea
                value={form.comment}
                onChange={(e) => setForm({...form, comment: e.target.value})}
                placeholder="Дополнительная информация"
                rows="2"
                disabled={isLoading}
              />
            </div>

            {/* ЗАКАЗ */}
            <div style={{ background: '#f9fafb', borderRadius: '16px', padding: '16px', marginTop: '8px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '12px', fontSize: '15px', margin: 0 }}>
                {t.yourOrder}
              </h3>
              {cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#6b7280' }}>
                    {item.name} ({item.selectedSize})
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {item.price.toLocaleString()} ₸
                  </span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>{t.total}:</span>
                <span>{getTotalPrice().toLocaleString()} ₸</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="fixed-bottom-button"
              style={{ opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? '⏳ Обработка...' : t.confirmOrder}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 👤 ПРОФИЛЬ
  const ProfileView = () => (
    <div className="pb-24 p-4">
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px', margin: 0 }}>
        {t.profile}
      </h2>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', background: 'white', borderRadius: '18px', padding: '16px' }}>
        <div className="avatar">👤</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>Пользователь</div>
          <div style={{ color: '#9ca3af', fontSize: '14px' }}>+7 (700) 000-00-00</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden' }}>
        {[
          { icon: '📦', label: t.myOrders },
          { icon: '❤️', label: t.favorites },
          { icon: '⚙️', label: t.settings },
          { icon: '💬', label: t.support }
        ].map((item, idx) => (
          <div 
            key={idx}
            style={{ 
              padding: '16px', 
              borderBottom: idx < 3 ? '1px solid #e5e7eb' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.target.parentElement.style.background = '#f9fafb'}
            onMouseOut={(e) => e.target.parentElement.style.background = 'white'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span style={{ fontWeight: 500, fontSize: '15px' }}>{item.label}</span>
            </div>
            <span style={{ color: '#9ca3af' }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );

  // 🧭 НАВИГАЦИЯ
  const BottomNav = () => (
    <div className="bottom-nav">
      {[
        { id: 'home', label: t.home, icon: '🏠' },
        { id: 'catalog', label: t.catalog, icon: '🛍️' },
        { id: 'cart', label: t.cart, icon: '🛒', badge: cart.length },
        { id: 'profile', label: t.profile, icon: '👤' }
      ].map(item => (
        <button
          key={item.id}
          onClick={() => {
            setView(item.id);
            if (item.id === 'catalog' && !selectedCategory) {
              setSelectedCategory('men');
            }
          }}
          className={`nav-item ${view === item.id ? 'active' : ''}`}
          style={{ position: 'relative' }}
        >
          <span style={{ fontSize: '20px' }}>{item.icon}</span>
          {item.badge > 0 && (
            <span className="badge">{item.badge}</span>
          )}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <Head>
        <title>Fashion Store</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
      </Head>

      <div>
        {view === 'home' && <HomeView />}
        {view === 'catalog' && <CatalogView />}
        {view === 'product' && <ProductView />}
        {view === 'cart' && <CartView />}
        {view === 'checkout' && <CheckoutView />}
        {view === 'profile' && <ProfileView />}
        
        <BottomNav />
      </div>
    </>
  );
}
