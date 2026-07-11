import Image from "next/image";
import logoImg from "@/logo-icon.png";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Image
      src={logoImg}
      alt="Innfetch"
      width={size}
      height={size}
      className="rounded-md shrink-0"
      priority
    />
  );
}
