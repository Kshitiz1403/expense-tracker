"use client";

import { useState } from "react";
import { Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface TransactionFiltersProps {
  onFilterChange?: (filters: any) => void;
}

export function TransactionFilters({ onFilterChange }: TransactionFiltersProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedType("");
    setSelectedSource("");
    onFilterChange?.({});
  };

  const hasActiveFilters = selectedCategory || selectedType || selectedSource;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Category Filter */}
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="groceries">Groceries</SelectItem>
          <SelectItem value="utilities">Utilities</SelectItem>
          <SelectItem value="shopping">Shopping</SelectItem>
          <SelectItem value="dining">Dining</SelectItem>
          <SelectItem value="transport">Transport</SelectItem>
          <SelectItem value="healthcare">Healthcare</SelectItem>
          <SelectItem value="entertainment">Entertainment</SelectItem>
          <SelectItem value="salary">Salary</SelectItem>
          <SelectItem value="freelance">Freelance</SelectItem>
        </SelectContent>
      </Select>

      {/* Type Filter */}
      <Select value={selectedType} onValueChange={setSelectedType}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="income">Income</SelectItem>
          <SelectItem value="expense">Expense</SelectItem>
        </SelectContent>
      </Select>

      {/* Source Filter */}
      <Select value={selectedSource} onValueChange={setSelectedSource}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sms">SMS</SelectItem>
          <SelectItem value="email">Email</SelectItem>
          <SelectItem value="bank">Bank Statement</SelectItem>
          <SelectItem value="manual">Manual</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range - Placeholder */}
      <Button variant="outline">
        <Calendar className="mr-2 h-4 w-4" />
        Date Range
      </Button>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-10"
        >
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 ml-2">
          {selectedCategory && (
            <Badge variant="secondary">
              Category: {selectedCategory}
              <button
                onClick={() => setSelectedCategory("")}
                className="ml-2 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedType && (
            <Badge variant="secondary">
              Type: {selectedType}
              <button
                onClick={() => setSelectedType("")}
                className="ml-2 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedSource && (
            <Badge variant="secondary">
              Source: {selectedSource}
              <button
                onClick={() => setSelectedSource("")}
                className="ml-2 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
