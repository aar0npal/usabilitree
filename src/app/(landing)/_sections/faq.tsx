import { Button } from "@/components/ui/button";
import Section from "../_components/section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";

export default function FAQ() {
  const faqs = [
    {
      question: "What is this website for?",
      answer: (
        <span>
          This is a free, lightweight tool for creating tree tests. It&apos;s a simpler alternative
          to UXTweak and Optimal Workshop, built by a solo developer. Not every feature is here yet,
          but I&apos;m actively improving it. A future overhaul will add more capabilities like card
          sorting, first-click testing, and more.
        </span>
      ),
    },
    // {
    //   question: "Why is it called UsabiliTree?",
    //   answer: (
    //     <span>
    //       UsabiliTree is a portmanteau of usability and tree. It&apos;s a play on the words
    //       usability and tree test. At first, I only wanted to build a tree test tool and bought that
    //       domain name, but I decided to add a card sort tool as well.
    //     </span>
    //   ),
    // },
    {
      question: "Is this tool free?",
      answer: (
        <span>
          Yes &mdash; you get 3 studies for free with unlimited participants. Need more? You can
          purchase additional study packs (5 studies for $5, one-time) from your{" "}
          <Button variant="linkHover1" className="h-0 p-0 after:-bottom-2 after:w-10">
            <Link href="/dashboard/billing">Billing</Link>
          </Button>{" "}
          page.
        </span>
      ),
    },
    {
      question: "Where is the demo?",
      answer: (
        <span>
          There is no demo. However, when you sign up, you&apos;ll see a sample active study in your
          dashboard to help you get familiar with tree testing. Please be guided by the onboarding
          flow—it&apos;s designed to walk you through the basics. If you choose &quot;No, I&apos;ll
          explore myself&quot;, you can still refer back to the sample study anytime.
          <br />
          <br />
          If you don&apos;t like something, please let me know through the Feedback button on the
          dashboard (once logged in) or DM me on{" "}
          <Button variant="linkHover1" className="h-0 p-0 after:-bottom-2 after:w-[50px]">
            <a href="https://discord.com/users/263841596213035009" target="_blank">
              Discord
            </a>
          </Button>
          .
        </span>
      ),
    },
    {
      question: "How often is it updated?",
      answer: (
        <span>
          As a sole developer maintaining this
          <Button variant="linkHover1" className="ml-1 h-0 p-0 after:-bottom-2 after:w-32">
            <Link href="https://github.com/ubergonmx/usabilitree" target="_blank">
              open-source project
            </Link>
          </Button>
          , I update it as often as I can. Your support really helps me move faster and keep things
          improving—if you&apos;d like to help boost development:
          <Button variant="linkHover1" className="ml-1 h-0 p-0 after:-bottom-2 after:w-[35px]">
            <Link href="https://ko-fi.com/aaronpal" target="_blank">
              Ko-fi
            </Link>
          </Button>
          .
          <br />
          <br />
          You can view the project roadmap and upcoming features at{" "}
          <Button variant="linkHover1" className="h-0 p-0 after:-bottom-2 after:w-[55px]">
            <Link href="https://usabilitree.userjot.com/roadmap" target="_blank">
              Roadmap
            </Link>
          </Button>
          .
          <br />
          <br />
          In the meantime, if you have any suggestions or requests, feel free to let me know through
          the Feedback button on the dashboard (once logged in) or DM me on{" "}
          <Button variant="linkHover1" className="h-0 p-0 after:-bottom-2 after:w-[50px]">
            <a href="https://discord.com/users/263841596213035009" target="_blank">
              Discord
            </a>
          </Button>
          .
        </span>
      ),
    },
    {
      question: "I encountered a bug; what should I do?",
      answer: (
        <span>
          Please report the bug on{" "}
          <Button variant="linkHover1" className="h-0 p-0 after:-bottom-2 after:w-12">
            <a href="https://github.com/ubergonmx/usabilitree/issues/new" target="_blank">
              GitHub
            </a>
          </Button>{" "}
          or DM me on{" "}
          <Button variant="linkHover1" className="h-0 p-0 after:-bottom-2 after:w-[50px]">
            <a href="https://discord.com/users/263841596213035009" target="_blank">
              Discord
            </a>
          </Button>
          . I&apos;ll try to fix it as soon as possible. If you can fix it yourself, please submit a
          pull request.
        </span>
      ),
    },
  ];

  return (
    <Section title="FAQ" subtitle="Frequently asked questions">
      <div className="mx-auto my-12 md:max-w-[800px]">
        <Accordion
          type="single"
          collapsible
          className="flex w-full flex-col items-center justify-center space-y-2"
        >
          {faqs.map((faq, idx) => (
            <AccordionItem
              key={idx}
              value={faq.question}
              className="w-full overflow-hidden rounded-lg border"
            >
              <AccordionTrigger className="px-4">{faq.question}</AccordionTrigger>
              <AccordionContent className="px-4">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <h4 className="mb-12 text-center text-sm font-medium tracking-tight text-foreground/80">
        Still have questions? Email us at{" "}
        <Button variant="linkHover1" className="p-0 after:w-[155px]">
          <a href="mailto:support@usabilitree.com">support@usabilitree.com</a>
        </Button>{" "}
        or DM me on{" "}
        <Button variant="linkHover1" className="p-0 after:w-12">
          <a href="https://discord.com/users/263841596213035009" target="_blank">
            Discord
          </a>
        </Button>
      </h4>
    </Section>
  );
}
