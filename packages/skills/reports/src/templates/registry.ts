/**
 * Template registry for the report generation skill.
 * Renderers task (task 1) provides concrete template implementations.
 * This stub registers built-in templates and provides lookup helpers.
 */

import { Type } from "@sinclair/typebox"
import type { MonthlyReportData, RenderOpts, ReportFormat, ReportTemplate } from "./types.js"

/** Built-in monthly report template. */
const monthlyReportTemplate: ReportTemplate = {
	name: "monthly-report",
	label: "Monthly Report",
	description: "A structured monthly report with summary metrics, charts, and tables.",
	schema: Type.Object({
		title: Type.String(),
		period: Type.Object({ from: Type.String(), to: Type.String() }),
		summary: Type.Array(
			Type.Object({
				metric: Type.String(),
				value: Type.Number(),
				change: Type.Number(),
			}),
		),
		charts: Type.Array(
			Type.Object({
				type: Type.Union([Type.Literal("bar"), Type.Literal("line"), Type.Literal("pie")]),
				title: Type.String(),
				data: Type.Array(Type.Object({ label: Type.String(), value: Type.Number() })),
			}),
		),
		tables: Type.Array(
			Type.Object({
				title: Type.String(),
				headers: Type.Array(Type.String()),
				rows: Type.Array(Type.Array(Type.Union([Type.String(), Type.Number()]))),
			}),
		),
	}),
	formats: ["pdf", "pptx", "csv", "xlsx", "png", "svg"],
	render: async (_format: ReportFormat, _data: MonthlyReportData, _opts: RenderOpts): Promise<Buffer> => {
		// Stub: concrete implementation provided by the renderers task.
		return Buffer.from(JSON.stringify({ stub: true }))
	},
}

const registry = new Map<string, ReportTemplate>([[monthlyReportTemplate.name, monthlyReportTemplate]])

/**
 * List all registered report templates.
 *
 * @returns Array of all registered templates.
 */
export const listTemplates = (): ReportTemplate[] => Array.from(registry.values())

/**
 * Look up a template by name.
 *
 * @param name - Template identifier.
 * @returns The template, or undefined if not found.
 */
export const getTemplate = (name: string): ReportTemplate | undefined => registry.get(name)

/**
 * Register a custom report template.
 *
 * @param template - Template to register.
 */
export const registerTemplate = (template: ReportTemplate): void => {
	registry.set(template.name, template)
}
