export default function Footer() {
  return (
    <div className="footer" id="kontak">
      <div className="box">
        <p>
          &copy; Copyrights 2024 by <span>Catchus Official</span>
        </p>
      </div>
      <div className="box">
        {/* WhatsApp */}
        <a
          href="https://wa.me/6283865961290"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="ri-whatsapp-fill ri-2x"></i>
        </a>

        {/* Instagram */}
        <a
          href="https://www.instagram.com/catchus.club/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="ri-instagram-fill ri-2x"></i>
        </a>

        {/* Shopee */}
        <a
          href="https://shopee.co.id/catchus.official"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="ri-shopping-bag-3-fill ri-2x"></i>
        </a>
      </div>
    </div>
  );
}
