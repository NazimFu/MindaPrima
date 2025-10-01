import Image from 'next/image'

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-[80px] h-[80px]">
        <Image 
          src="/images/MP-LOGO.png"
          alt="Minda Prima Logo"
          fill
          priority
          className="object-contain"
          sizes="80px"
        />
      </div>
      <h1 className="text-3xl font-bold text-primary tracking-tight">
        Minda Prima
      </h1>
    </div>
  );
}
