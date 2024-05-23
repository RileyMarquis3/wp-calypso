import { useQuery } from '@tanstack/react-query';
import wpcom from 'calypso/lib/wp';
import type {
	PostByVoice,
	PostByVoiceResponse,
} from 'calypso/my-sites/site-settings/publishing-tools/types';

export const getPostByVoicePath = ( siteId: number | null ) => `/sites/${ siteId }/post-by-voice`;

export const getCachePostByVoiceKey = ( siteId: number | null ) => [
	'sites',
	siteId,
	'post-by-voice',
];

export const parsePostByVoiceResponse = ( data: PostByVoiceResponse ): PostByVoice => ( {
	isEnabled: data.is_enabled,
	code: data.code,
} );

export const useGetPostByVoice = ( siteId: number | null ) => {
	return useQuery< PostByVoice >( {
		queryKey: getCachePostByVoiceKey( siteId ),
		queryFn: async () => {
			const response: PostByVoiceResponse = await wpcom.req.get( {
				path: getPostByVoicePath( siteId ),
				apiNamespace: 'wpcom/v2',
			} );

			return parsePostByVoiceResponse( response );
		},
		enabled: !! siteId,
	} );
};
