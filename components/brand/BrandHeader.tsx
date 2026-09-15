import Image from "next/image";

export function BrandHeader({ preview }: { preview?: boolean }) {
  return (
    <header className="brand-header">
      <div className="brand-logo" aria-label="MK Jewels">
        <Image src="/brand/mk-jewels-gold-on-white.jpeg" alt="MK Jewels" width="1856" height="1058" priority />
      </div>
      {preview ? <span className="preview-label">Development preview</span> : null}
    </header>
  );
}
