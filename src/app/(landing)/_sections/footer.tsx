import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { CodeIcon } from "@radix-ui/react-icons";
import Link from "next/link";

const githubAccountUrl = "https://github.com/ubergonmx";

export function Footer() {
  return (
    <footer className="mx-auto flex max-w-5xl flex-col gap-y-3 px-5 pb-5 pt-10 lg:px-0">
      <div className="container flex items-center p-0">
        <CodeIcon className="mr-2 h-6 w-6" />
        <p className="text-sm">
          Built by{" "}
          <Button variant="linkHover1" className="p-0 after:w-[60px]">
            <a href={githubAccountUrl} target="_blank">
              aaronpal
            </a>
          </Button>
          .
        </p>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
      <div className="container flex flex-wrap items-center gap-x-4 gap-y-1 p-0 text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground hover:underline">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-foreground hover:underline">
          Terms of Service
        </Link>
        <a href="mailto:support@usabilitree.com" className="hover:text-foreground hover:underline">
          support@usabilitree.com
        </a>
      </div>
    </footer>
  );
}
