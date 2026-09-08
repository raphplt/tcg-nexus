import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

describe("UI Primitives", () => {
  describe("Progress", () => {
    it("renders progress bar with custom value and class", () => {
      const { container } = render(
        <Progress value={45} className="custom-progress" />,
      );
      expect(container.firstChild).toHaveClass("custom-progress");
      expect(container.firstChild).toHaveClass("bg-secondary");
      const indicator = container.querySelector(".bg-primary");
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveStyle({ transform: "translateX(-55%)" });
    });

    it("handles 0 or undefined value gracefully", () => {
      const { container } = render(<Progress value={undefined} />);
      const indicator = container.querySelector(".bg-primary");
      expect(indicator).toHaveStyle({ transform: "translateX(-100%)" });
    });
  });

  describe("Popover", () => {
    it("renders popover trigger and anchor slots", () => {
      render(
        <Popover open>
          <PopoverAnchor>
            <PopoverTrigger asChild>
              <button type="button">Open Popover</button>
            </PopoverTrigger>
          </PopoverAnchor>
          <PopoverContent className="custom-popover">
            Popover Content
          </PopoverContent>
        </Popover>,
      );

      expect(
        screen.getByRole("button", { name: "Open Popover" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Popover Content")).toBeInTheDocument();
      expect(screen.getByText("Popover Content")).toHaveClass("custom-popover");
    });
  });

  describe("Command", () => {
    it("renders command palette structure with list, items, and shortcuts", () => {
      render(
        <Command className="custom-command">
          <CommandInput placeholder="Type a command..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem>
                <span>Profile</span>
                <CommandShortcut>⌘P</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </CommandList>
        </Command>,
      );

      expect(
        screen.getByPlaceholderText("Type a command..."),
      ).toBeInTheDocument();
      expect(screen.getByText("Suggestions")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("⌘P")).toBeInTheDocument();
    });
  });
});
