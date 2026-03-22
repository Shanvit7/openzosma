import chatService from "@/src/services/chat.services"
import { QUERY_KEYS } from "@/src/utils/query-keys"
import { useQuery } from "@tanstack/react-query"

export const useGetConversations = () => {
	return useQuery({
		queryKey: [QUERY_KEYS.CONVERSATIONS],
		queryFn: () => chatService.listConversations(),
	})
}
