import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  describe("Select", () => {
    it("renders trigger with default and sm sizes", () => {
      const { rerender } = render(
        <Select>
          <SelectTrigger size="default">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
        </Select>,
      );

      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveAttribute("data-size", "default");
      expect(screen.getByText("Select an option")).toBeInTheDocument();

      rerender(
        <Select>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Small option" />
          </SelectTrigger>
        </Select>,
      );
      expect(trigger).toHaveAttribute("data-size", "sm");
    });

    it("renders select content, groups, labels, items and separators when open", () => {
      render(
        <Select open={true}>
          <SelectTrigger>
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent className="custom-content">
            <SelectGroup>
              <SelectLabel className="custom-label">Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana" disabled>
                Banana
              </SelectItem>
            </SelectGroup>
            <SelectSeparator className="custom-separator" />
            <SelectGroup>
              <SelectLabel>Vegetables</SelectLabel>
              <SelectItem value="carrot">Carrot</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>,
      );

      expect(screen.getByText("Fruits")).toBeInTheDocument();
      expect(screen.getByText("Apple")).toBeInTheDocument();
      expect(screen.getByText("Banana")).toBeInTheDocument();
      expect(screen.getByText("Vegetables")).toBeInTheDocument();
      expect(screen.getByText("Carrot")).toBeInTheDocument();
    });

    it("renders select items and supports value selection", () => {
      const onValueChange = vi.fn();
      render(
        <Select open={true} onValueChange={onValueChange}>
          <SelectTrigger>
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opt1">Option 1</SelectItem>
            <SelectItem value="opt2">Option 2</SelectItem>
          </SelectContent>
        </Select>,
      );

      expect(screen.getByText("Option 1")).toBeInTheDocument();
      expect(screen.getByText("Option 2")).toBeInTheDocument();
    });
  });
});
