import { signFileUrl } from "@/lib/storageUrl";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  src: string | null | undefined;
};

export function SignedLink({ src, onClick, children, ...rest }: Props) {
  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (e.defaultPrevented) return;
    e.preventDefault();
    const url = await signFileUrl(src, 600);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };
  return (
    <a href="#" onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
