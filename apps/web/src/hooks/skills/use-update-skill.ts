import type { UpdateSkillPayload } from "@/src/services/skills.services"
import skillsService from "@/src/services/skills.services"
import { QUERY_KEYS } from "@/src/utils/query-keys"
import { useMutation, useQueryClient } from "@tanstack/react-query"

const useUpdateSkill = () => {
	const queryClient = useQueryClient()
	const { SKILLS } = QUERY_KEYS
	return useMutation({
		mutationFn: ({ id, ...payload }: UpdateSkillPayload & { id: string }) => skillsService.updateSkill(id, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [SKILLS] })
		},
	})
}

export default useUpdateSkill
