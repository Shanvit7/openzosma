import KnowledgeBasePanel from "@/src/components/organisms/knowledge-base"
// COMPONENTS
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
// ICONS
import { IconDatabase } from "@tabler/icons-react"

const KnowledgeBasePage = () => {
	return (
		<div className="flex flex-col w-full h-full gap-6">
			{/* Knowledge Base */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<IconDatabase className="size-4" />
						Knowledge Base
					</CardTitle>
					<CardDescription>Manage your knowledge base.</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<KnowledgeBasePanel />
				</CardContent>
			</Card>
		</div>
	)
}

export default KnowledgeBasePage
