import Image from "next/image";

/**
 * The supplied logo is a large JPEG with wide margins, so the wordmark is
 * cropped to a fixed box in CSS. `sizes` is what keeps the optimizer from
 * serving a 1920px-wide image for a 160px mark on the critical path.
 */
export function BrandHeader({ preview }: { preview?: boolean }) {
  return (
    <header className="brand-header">
      <div className="brand-logo">
        <Image
          src="/brand/mk-jewels-gold-on-white.jpeg"
          alt="MK Jewels"
          width={1856}
          height={1058}
          sizes="190px"
          priority
        />
      </div>
      {preview ? <span className="preview-label">Development preview</span> : null}
    </header>
  );
}
