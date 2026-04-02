import skillsService from "@/src/services/skills.services"
import { QUERY_KEYS } from "@/src/utils/query-keys"
import { useMutation, useQueryClient } from "@tanstack/react-query"

const useDeleteSkill = () => {
	const queryClient = useQueryClient()
	const { SKILLS } = QUERY_KEYS
	return useMutation({
		mutationFn: (id: string) => skillsService.deleteSkill(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [SKILLS] })
		},
	})
}

export default useDeleteSkill
