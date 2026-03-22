"use client";

import { useState } from "react";
import type { QuoteFormErrors } from "@/src/features/quotes/form";
import { validateQuoteInput } from "@/src/features/quotes/form";
import type { QuoteFormState } from "@/src/features/quotes/types";

type QuoteFormProps = {
  initialValues: QuoteFormState;
  heading: string;
  submitLabel: string;
  description?: string;
  notice?: string;
  warning?: string;
  onSubmit: (values: QuoteFormState) => void;
};

export function QuoteForm({
  initialValues,
  heading,
  submitLabel,
  description,
  notice,
  warning,
  onSubmit,
}: QuoteFormProps) {
  const [values, setValues] = useState<QuoteFormState>(initialValues);
  const [errors, setErrors] = useState<QuoteFormErrors>({});

  function updateField<K extends keyof QuoteFormState>(key: K, value: QuoteFormState[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
      onSubmit={(event) => {
        event.preventDefault();
        const nextErrors = validateQuoteInput(values);
        if (Object.keys(nextErrors).length > 0) {
          setErrors(nextErrors);
          return;
        }
        setErrors({});
        onSubmit(values);
      }}
    >
      <div className="space-y-1">
        <div className="text-sm font-semibold">{heading}</div>
        {description ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
        ) : null}
      </div>

      {notice ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950 dark:text-sky-100">
          {notice}
        </div>
      ) : null}

      {warning ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950 dark:text-amber-100">
          {warning}
        </div>
      ) : null}

      <label className="block space-y-1">
        <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">From address</div>
        <input
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          value={values.fromAddress}
          onChange={(event) => updateField("fromAddress", event.target.value)}
        />
        {errors.fromAddress ? <p className="text-xs text-red-600">{errors.fromAddress}</p> : null}
      </label>

      <label className="block space-y-1">
        <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">To address</div>
        <input
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          value={values.toAddress}
          onChange={(event) => updateField("toAddress", event.target.value)}
        />
        {errors.toAddress ? <p className="text-xs text-red-600">{errors.toAddress}</p> : null}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Move date</div>
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            value={values.moveDateISO}
            onChange={(event) => updateField("moveDateISO", event.target.value)}
          />
          {errors.moveDateISO ? <p className="text-xs text-red-600">{errors.moveDateISO}</p> : null}
        </label>

        <label className="block space-y-1">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Move time</div>
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            value={values.moveTime}
            onChange={(event) => updateField("moveTime", event.target.value)}
          />
          {errors.moveTime ? <p className="text-xs text-red-600">{errors.moveTime}</p> : null}
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Distance (km)</div>
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            value={values.distanceKm}
            type="number"
            min={1}
            onChange={(event) => updateField("distanceKm", Number(event.target.value))}
          />
          {errors.distanceKm ? <p className="text-xs text-red-600">{errors.distanceKm}</p> : null}
        </label>

        <label className="block space-y-1">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Items count</div>
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            value={values.itemsCount}
            type="number"
            min={1}
            onChange={(event) => updateField("itemsCount", Number(event.target.value))}
          />
          {errors.itemsCount ? <p className="text-xs text-red-600">{errors.itemsCount}</p> : null}
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.hasPacking}
          onChange={(event) => updateField("hasPacking", event.target.checked)}
        />
        Add packing service
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.hasStorage}
          onChange={(event) => updateField("hasStorage", event.target.checked)}
        />
        Add storage
      </label>

      {errors.form ? <p className="text-xs text-red-600">{errors.form}</p> : null}

      <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
        {submitLabel}
      </button>
    </form>
  );
}
