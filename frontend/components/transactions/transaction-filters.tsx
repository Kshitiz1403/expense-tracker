"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { api, Category } from "@/lib/api";

export interface ActiveFilters {
  type?: string;
  source?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface TransactionFiltersProps {
  onFilterChange: (filters: ActiveFilters) => void;
}

export function TransactionFilters({ onFilterChange }: TransactionFiltersProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {});
  }, []);

  const notify = (type: string, source: string, category: string, from: string, to: string) => {
    onFilterChange({
      type: type || undefined,
      source: source || undefined,
      category: category || undefined,
      dateFrom: from || undefined,
      dateTo: to || undefined,
    });
  };

  const handleTypeChange = (value: string) => {
    const next = value === "_all" ? "" : value;
    setSelectedType(next);
    notify(next, selectedSource, selectedCategory, dateFrom, dateTo);
  };

  const handleSourceChange = (value: string) => {
    const next = value === "_all" ? "" : value;
    setSelectedSource(next);
    notify(selectedType, next, selectedCategory, dateFrom, dateTo);
  };

  const handleCategoryChange = (value: string) => {
    const next = value === "_all" ? "" : value;
    setSelectedCategory(next);
    notify(selectedType, selectedSource, next, dateFrom, dateTo);
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    notify(selectedType, selectedSource, selectedCategory, value, dateTo);
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    notify(selectedType, selectedSource, selectedCategory, dateFrom, value);
  };

  const clearFilters = () => {
    setSelectedType("");
    setSelectedSource("");
    setSelectedCategory("");
    setDateFrom("");
    setDateTo("");
    onFilterChange({});
  };

  const hasActiveFilters = selectedType || selectedSource || selectedCategory || dateFrom || dateTo;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={selectedType || "_all"} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Types</SelectItem>
          <SelectItem value="income">Income</SelectItem>
          <SelectItem value="expense">Expense</SelectItem>
        </SelectContent>
      </Select>

      <Select value={selectedSource || "_all"} onValueChange={handleSourceChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Sources</SelectItem>
          <SelectItem value="sms">SMS</SelectItem>
          <SelectItem value="email">Email</SelectItem>
          <SelectItem value="bank_statement">Bank Statement</SelectItem>
          <SelectItem value="manual">Manual</SelectItem>
        </SelectContent>
      </Select>

      <Select value={selectedCategory || "_all"} onValueChange={handleCategoryChange}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        value={dateFrom}
        onChange={(e) => handleDateFromChange(e.target.value)}
        className="w-[150px]"
        placeholder="From"
        title="From date"
      />
      <Input
        type="date"
        value={dateTo}
        onChange={(e) => handleDateToChange(e.target.value)}
        className="w-[150px]"
        placeholder="To"
        title="To date"
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
