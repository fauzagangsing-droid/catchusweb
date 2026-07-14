export default function Hero() {
  return (
    <div className="hero">
      <div className="container">
        <div className="hero-box">
          <div className="box" data-aos="fade-right" data-aos-duration="1000">
            <h1>
              Catchus Katalog
              <br />
            </h1>
            <p>
              Catchus menghadirkan koleksi apparel dengan desain khas dan
              kualitas terbaik. Setiap produk diproduksi dengan bahan pilihan
              serta perhatian tinggi pada detail, sehingga memberikan
              kenyamanan dan daya tahan lebih lama. Kami percaya bahwa fashion
              bukan hanya tentang pakaian, tetapi tentang bagaimana kamu
              mengekspresikan diri. Temukan koleksi Catchus yang sesuai
              dengan gaya
            </p>
            <a href="#">Detail Produk</a>
          </div>
          <div className="class-box" data-aos="fade-left" data-aos-duration="1000">
            <img src="/images/catchus.PNG" alt="Hero Image" />
          </div>
        </div>
      </div>
    </div>
  );
}
