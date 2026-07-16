export default function Layanan({ brandName }: { brandName: string }) {
  return (
    <div className="layanan" id="layanan">
      <div className="container">
        <div className="layanan-box">
          <div className="box" data-aos="fade-up" data-aos-duration="1000">
            <i className="ri-star-fill ri-2x"></i>
            <h2>Produk Original</h2>
            <p>
              {brandName} selalu menghadirkan produk dengan kualitas terbaik dan
              100% original. Setiap item dibuat dengan bahan pilihan dan
              melalui proses kontrol kualitas yang ketat agar kamu
              mendapatkan pengalaman terbaik. Dengan {brandName}, kamu bisa
              belanja tanpa ragu karena keaslian dan kualitas adalah
              prioritas kami.
            </p>
          </div>
          <div className="box" data-aos="fade-down" data-aos-duration="1000">
            <i className="ri-price-tag-fill ri-2x"></i>
            <h2>Harga Terjangkau</h2>
            <p>
              {brandName} percaya bahwa produk berkualitas tidak harus mahal.
              Kami menawarkan harga yang jujur dan ramah di kantong tanpa
              mengorbankan mutu. Setiap pembelian memberikan nilai lebih,
              sehingga kamu bisa mendapatkan produk premium dengan harga
              yang tetap bersahabat.
            </p>
          </div>
          <div className="box" data-aos="fade-up" data-aos-duration="1000">
            <i className="ri-shopping-cart-fill ri-2x"></i>
            <h2>Terjual 100+</h2>
            <p>
              Terbukti dipercaya banyak pelanggan! Produk {brandName} sudah
              terjual lebih dari 100+ dan terus bertambah setiap hari.
              Testimoni positif dan tingkat repeat order yang tinggi menjadi
              bukti bahwa {brandName} memang layak jadi pilihan utama kamu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
