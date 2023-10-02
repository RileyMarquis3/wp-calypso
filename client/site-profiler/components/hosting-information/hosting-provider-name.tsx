import { translate } from 'i18n-calypso';
import { UrlData } from 'calypso/blocks/import/types';
import InfoPopover from 'calypso/components/info-popover';
import VerifiedProvider from '../domain-information/verified-provider';
import HostingPopupContent from './popup-inline-content';
import type { HostingProvider } from 'calypso/data/site-profiler/types';

interface Props {
	hostingProvider?: HostingProvider;
	urlData?: UrlData;
}

export default function HostingProviderName( props: Props ) {
	const { hostingProvider, urlData } = props;
	const isPopularCdn = !! hostingProvider?.is_cdn;

	const NonA8cHostingName = () => {
		const nameComponent = hostingProvider?.homepage_url ? (
			<a href={ hostingProvider.homepage_url } target="_blank" rel="nofollow noreferrer">
				{ hostingProvider.name }
			</a>
		) : (
			hostingProvider?.name
		);

		return (
			<>
				{ nameComponent }
				{ urlData?.platform === 'wordpress' && (
					<>
						&nbsp;&nbsp;
						<a href={ `${ urlData.url }wp-admin` } target="_blank" rel="nofollow noreferrer">
							({ translate( 'login' ) })
						</a>
					</>
				) }
				{ isPopularCdn && (
					<InfoPopover className="hosting-provider-name__tooltip" position="top">
						<HostingPopupContent hostingProvider={ hostingProvider } />
					</InfoPopover>
				) }
			</>
		);
	};

	return (
		<div className="hosting-provider-name__container">
			{ hostingProvider?.slug !== 'automattic' && <NonA8cHostingName /> }
			{ hostingProvider?.slug === 'automattic' && <VerifiedProvider /> }
		</div>
	);
}
