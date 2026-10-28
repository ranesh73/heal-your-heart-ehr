import { ReactNode, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { X, Plus, LoaderCircle, Inbox, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Field, Row, label } from "./api";

export const cn = (...v: Parameters<typeof clsx>) => twMerge(clsx(v));
export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={cn("button", variant, className)} {...props}>
      {children}
    </button>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={cn("badge", value?.toLowerCase().replaceAll(" ", "-"))}>
      {label(value)}
    </span>
  );
}
export function Empty({
  title = "No records yet",
  body = "New records will appear here.",
  action,
}: {
  title?: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={26} />
      <strong>{title}</strong>
      <p>{body}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={20} /> Loading workspace…
    </div>
  );
}
export function ErrorBox({ error }: { error: unknown }) {
  return error ? (
    <div className="error" role="alert">
      {error instanceof Error ? error.message : String(error)}
    </div>
  ) : null;
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="actions">{actions}</div>
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel", className)}>
      {title && (
        <div className="panel-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((x) => (
        <button
          key={x}
          role="tab"
          aria-selected={value === x}
          className={value === x ? "active" : ""}
          onClick={() => onChange(x)}
        >
          {x}
        </button>
      ))}
    </div>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className={cn("modal", wide && "wide")}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="modal-head">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {description ||
                  "Changes are saved to the selected patient and branch."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" aria-label="Close dialog">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function FieldControl({
  field,
  register,
  errors,
  choices = {},
}: {
  field: Field;
  register: any;
  errors: any;
  choices?: Record<string, Row[]>;
}) {
  const key = field.name;
  const type = field.type || "text";
  const opts: Row[] | undefined =
    field.options?.map((v) => ({ id: v, name: v })) || choices[type];
  const validation = {
    required: field.required ? "Required" : false,
    ...(type === "number"
      ? {
          valueAsNumber: true,
          min: field.min ?? undefined,
          max: field.max ?? undefined,
        }
      : {}),
  };
  return (
    <label className={cn("field", type === "textarea" && "full")}>
      <span>
        {field.label}
        {field.required && <b aria-hidden="true"> *</b>}
      </span>
      {opts ? (
        <select aria-label={field.label} {...register(key, validation)}>
          <option value="">Select…</option>
          {opts.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name || o.title || o.program}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea rows={3} aria-label={field.label} {...register(key, validation)} />
      ) : (
        <input
          aria-label={field.label}
          type={
            type === "checkbox"
              ? "checkbox"
              : type === "number"
                ? "number"
                : type === "date"
                  ? "date"
                  : type === "datetime-local"
                    ? "datetime-local"
                    : type === "password"
                      ? "password"
                      : type === "email"
                        ? "email"
                        : "text"
          }
          step={type === "number" ? "any" : undefined}
          {...register(key, validation)}
        />
      )}{" "}
      {errors[key] && (
        <small className="field-error">
          {String(errors[key].message || "Check value")}
        </small>
      )}
    </label>
  );
}
export function DynamicForm({
  fields,
  initial = {},
  choices = {},
  onSubmit,
  submit = "Save record",
  footer,
  children,
}: {
  fields: Field[];
  initial?: Row;
  choices?: Record<string, Row[]>;
  onSubmit: (data: Row) => Promise<unknown>;
  submit?: string;
  footer?: string;
  children?: ReactNode;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: initial });
  const [error, setError] = useState<unknown>();
  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        setError(undefined);
        try {
          const data = { ...values };
          for (const f of fields) {
            if (
              (f.type === "number" || f.type === "date") &&
              (data[f.name] === "" || Number.isNaN(data[f.name]))
            )
              data[f.name] = null;
          }
          await onSubmit(data);
        } catch (e) {
          setError(e);
        }
      })}
    >
      <div className="form-grid">
        {fields.map((f) => (
          <FieldControl
            key={f.name}
            field={f}
            register={register}
            errors={errors}
            choices={choices}
          />
        ))}
      </div>
      {children}
      <ErrorBox error={error} />
      <div className="form-footer">
        <small>{footer}</small>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="spin" size={16} /> : null}
          {submit}
        </Button>
      </div>
    </form>
  );
}
export function Table({
  columns,
  rows,
  empty = "No matching records",
  onRow,
}: {
  columns: { title: string; render: (row: Row) => ReactNode }[];
  rows: Row[];
  empty?: string;
  onRow?: (row: Row) => void;
}) {
  if (!rows.length) return <Empty title={empty} />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}>{c.title}</th>
            ))}
            {onRow && (
              <th>
                <span className="sr-only">Open</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {columns.map((c, j) => (
                <td key={j}>{c.render(r)}</td>
              ))}
              {onRow && (
                <td>
                  <Button
                    variant="ghost"
                    aria-label={"Open " + (r.name || r.title || "record")}
                    onClick={() => onRow(r)}
                  >
                    <ChevronRight size={17} />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function AddButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick}>
      <Plus size={16} />
      {children}
    </Button>
  );
}
