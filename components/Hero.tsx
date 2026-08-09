interface HeroProps {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonUrl: string;
}

export default function Hero({ title, subtitle, buttonText, buttonUrl }: HeroProps) {
  return (
    <div className="hero">
      <div className="container">
        <div className="hero-box">
          <div className="box" data-aos="fade-right" data-aos-duration="1000">
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <a href={buttonUrl}>{buttonText}</a>
          </div>
          <div className="class-box" data-aos="fade-left" data-aos-duration="1000">
            {/* The plain img preserves the established CSS sizing and loading behavior. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/catchus.PNG" alt={`${title} apparel collection`} />
          </div>
        </div>
      </div>
    </div>
  );
}
