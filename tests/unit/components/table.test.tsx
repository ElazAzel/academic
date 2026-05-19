// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

describe("Table", () => {
  it("renders dense operational table chrome", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Слушатель</TableHead>
            <TableHead>Риск</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Анна</TableCell>
            <TableCell>Высокий</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const table = screen.getByRole("table");
    expect(table.parentElement?.className).toContain("overflow-auto");
    expect(table.parentElement?.className).toContain("shadow-m3-soft");

    const header = screen.getAllByRole("rowgroup")[0];
    expect(header.className).toContain("sticky");

    const column = screen.getByRole("columnheader", { name: "Слушатель" });
    expect(column.className).toContain("h-10");
    expect(column.className).toContain("uppercase");

    expect(screen.getByText("Анна").className).toContain("py-2.5");
  });
});
