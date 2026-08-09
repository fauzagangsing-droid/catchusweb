import { modelImages } from "@/lib/products";

export default function ModelGallery() {
  return (
    <div className="Model" id="Model">
      <div className="container">
        <div className="Model-box" data-aos="fade-down" data-aos-duration="1000">
          <div className="Model-list">
            {modelImages.map((model) => (
              // Plain img elements preserve the gallery's existing CSS and loading behavior.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={model.id}
                src={model.image}
                alt={model.alt}
                data-filter={model.filter}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
