// Shop-segment loading fallback. It reuses the existing catalog classes so no
// additional styling is needed.
export default function Loading() {
  return (
    <div className="produk">
      <div className="container">
        <div className="produk-box">
          <h1>Produk Kami</h1>
          <p>Memuat produk...</p>
        </div>
      </div>
    </div>
  );
}
