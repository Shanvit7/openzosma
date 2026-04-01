/**
 * Types for the report generation skill.
 * Renderers task (task 1) provides concrete implementations.
 */
import type { TSchema } from "@sinclair/typebox"
export type { TSchema }

/** Output format supported by report templates. */
export type ReportFormat = "pdf" | "pptx" | "csv" | "xlsx" | "png" | "svg"

/** Options passed to a template renderer. */
export interface RenderOpts {
	/** Directory where the rendered file should be written. */
	outputDir: string
}

/** A single chart definition within a report. */
export interface ChartDefinition {
	type: "bar" | "line" | "pie"
	title: string
	data: { label: string; value: number }[]
}

/** A single table definition within a report. */
export interface TableDefinition {
	title: string
	headers: string[]
	rows: (string | number)[][]
}

/** Data schema for the built-in monthly report template. */
export interface MonthlyReportData {
	title: string
	period: { from: string; to: string }
	summary: { metric: string; value: number; change: number }[]
	charts: ChartDefinition[]
	tables: TableDefinition[]
}

/** A report template definition. */
export interface ReportTemplate {
	/** Unique template identifier, e.g. "monthly-report". */
	name: string
	/** Human-readable display name. */
	label: string
	/** Short description of what the template produces. */
	description: string
	/** TypeBox schema for the data payload. */
	schema: TSchema
	/** Supported output formats for this template. */
	formats: ReportFormat[]
	/**
	 * Render the template to a Buffer.
	 *
	 * @param format - Output format.
	 * @param data - Template data matching the schema.
	 * @param opts - Render options.
	 * @returns Buffer containing the rendered output.
	 */
	render: (format: ReportFormat, data: MonthlyReportData, opts: RenderOpts) => Promise<Buffer>
}
