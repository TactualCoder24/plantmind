import Image from "next/image";
import logoImg from "@/logo.png";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Image
      src={logoImg}
      alt="PlantMind"
      width={size}
      height={size}
      className="rounded-md shrink-0"
      priority
    />
  );
}
