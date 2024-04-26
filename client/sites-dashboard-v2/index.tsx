import pageRouter from '@automattic/calypso-router';
import {
	SitesSortKey,
	useSitesListFiltering,
	useSitesListGrouping,
	useSitesListSorting,
} from '@automattic/sites';
import { GroupableSiteLaunchStatuses } from '@automattic/sites/src/use-sites-list-grouping';
import { useI18n } from '@wordpress/react-i18n';
import classNames from 'classnames';
import { translate } from 'i18n-calypso';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	DATAVIEWS_LIST,
	DATAVIEWS_TABLE,
	initialDataViewsState,
} from 'calypso/a8c-for-agencies/components/items-dashboard/constants';
import { DataViewsState } from 'calypso/a8c-for-agencies/components/items-dashboard/items-dataviews/interfaces';
import Layout from 'calypso/a8c-for-agencies/components/layout';
import LayoutColumn from 'calypso/a8c-for-agencies/components/layout/column';
import LayoutHeader, {
	LayoutHeaderActions as Actions,
	LayoutHeaderTitle as Title,
} from 'calypso/a8c-for-agencies/components/layout/header';
import LayoutTop from 'calypso/a8c-for-agencies/components/layout/top';
import DocumentHead from 'calypso/components/data/document-head';
import { useSiteExcerptsQuery } from 'calypso/data/sites/use-site-excerpts-query';
import { SitesDashboardQueryParams } from 'calypso/sites-dashboard/components/sites-content-controls';
import {
	useShowSiteCreationNotice,
	useShowSiteTransferredNotice,
} from 'calypso/sites-dashboard/components/sites-dashboard';
import { useSitesSorting } from 'calypso/state/sites/hooks/use-sites-sorting';
import { DOTCOM_OVERVIEW } from './site-preview-pane/constants';
import DotcomPreviewPane from './site-preview-pane/dotcom-preview-pane';
import SitesDashboardHeader from './sites-dashboard-header';
import DotcomSitesDataViews, { siteStatusGroups } from './sites-dataviews';
import { getSitesPagination } from './sites-dataviews/utils';

// todo: we are using A4A styles until we extract them as common styles in the ItemsDashboard component
import './style.scss';

// Add Dotcom specific styles
import './dotcom-style.scss';

interface SitesDashboardProps {
	queryParams: SitesDashboardQueryParams;
	initialSiteFeature?: string;
	initialSiteSubfeature?: string;
	selectedSite?: any;
	selectedSiteParams?: any;
}

const siteSortingKeys = [
	{ dataView: 'site', sortKey: 'alphabetically' },
	{ dataView: 'magic', sortKey: 'lastInteractedWith' },
	{ dataView: 'last-publish', sortKey: 'updatedAt' },
];

const DEFAULT_PER_PAGE = 50;
const DEFAULT_STATUS_GROUP = 'all';

function syncURL(
	siteSlug: string | null,
	siteParams: any,
	feature: string,
	queryParams: SitesDashboardQueryParams
) {
	let url: string;
	if ( siteSlug ) {
		url = '/' + feature.replace( ':site', siteSlug );
		Object.keys( siteParams ).forEach( ( key ) => {
			const value = siteParams[ key ];
			url = url.replace( ':' + key, value );
		} );
	} else {
		url = '/sites';
	}

	const searchParams = new URLSearchParams();
	Object.keys( queryParams ).forEach( ( key ) => {
		const value = queryParams[ key as keyof SitesDashboardQueryParams ];
		if ( value ) {
			searchParams.set( key, value.toString() );
		}
	} );

	if ( searchParams.size > 0 ) {
		url += '?' + searchParams.toString();
	}

	if ( pageRouter.current !== url ) {
		pageRouter.show( url );
	}
}

const SitesDashboardV2 = ( {
	// Note - control params (eg. search, page, perPage, status...) are currently meant for
	// initializing the dataViewsState. Further calculations should reference the dataViewsState.
	queryParams: {
		page = 1,
		perPage = DEFAULT_PER_PAGE,
		search,
		newSiteID,
		status = DEFAULT_STATUS_GROUP,
	},
	selectedSite,
	selectedSiteParams = {},
	initialSiteFeature = DOTCOM_OVERVIEW,
	initialSiteSubfeature = initialSiteFeature,
}: SitesDashboardProps ) => {
	const { __ } = useI18n();
	const initialSortApplied = useRef( false );

	const { hasSitesSortingPreferenceLoaded, sitesSorting, onSitesSortingChange } = useSitesSorting();

	const { data: liveSites = [], isLoading } = useSiteExcerptsQuery(
		[],
		( site ) => ! site.options?.is_domain_only
	);

	const { data: deletedSites = [] } = useSiteExcerptsQuery(
		[],
		( site ) => ! site.options?.is_domain_only,
		'deleted'
	);

	const allSites = liveSites.concat( deletedSites );

	useShowSiteCreationNotice( allSites, newSiteID );
	useShowSiteTransferredNotice();

	// Create the DataViews state based on initial values
	const defaultDataViewsState = {
		...initialDataViewsState,
		page,
		perPage,
		search: search ?? '',
		hiddenFields: [ 'magic' ],
		filters:
			status === 'all'
				? []
				: [
						{
							field: 'status',
							operator: 'in',
							value: siteStatusGroups.find( ( item ) => item.slug === status )?.value || 1,
						},
				  ],
		selectedItem: selectedSite,
		type: selectedSite ? DATAVIEWS_LIST : DATAVIEWS_TABLE,
	} as DataViewsState;
	const [ dataViewsState, setDataViewsState ] = useState< DataViewsState >( defaultDataViewsState );

	const [ selectedSiteFeature, setSelectedSiteFeature ] = useState( initialSiteFeature );
	const [ selectedSiteSubfeature, setSelectedSiteSubfeature ] = useState( initialSiteSubfeature );

	// Ensure site sort preference is applied when it loads in. This isn't always available on
	// initial mount.
	useEffect( () => {
		// Ensure we set and check initialSortApplied to prevent infinite loops when changing sort
		// values after initial sort.
		if ( hasSitesSortingPreferenceLoaded && ! initialSortApplied.current ) {
			const newSortField =
				siteSortingKeys.find( ( key ) => key.sortKey === sitesSorting.sortKey )?.dataView || '';
			const newSortDirection = sitesSorting.sortOrder;

			setDataViewsState( ( prevState ) => ( {
				...prevState,
				sort: {
					field: newSortField,
					direction: newSortDirection,
				},
			} ) );

			initialSortApplied.current = true;
		}
	}, [ hasSitesSortingPreferenceLoaded, sitesSorting, dataViewsState.sort ] );

	// Get the status group slug.
	const statusSlug = useMemo( () => {
		const statusFilter = dataViewsState.filters.find( ( filter ) => filter.field === 'status' );
		const statusNumber = statusFilter?.value || 1;
		return ( siteStatusGroups.find( ( status ) => status.value === statusNumber )?.slug ||
			'all' ) as GroupableSiteLaunchStatuses;
	}, [ dataViewsState.filters ] );

	// Filter sites list by status group.
	const { currentStatusGroup } = useSitesListGrouping( allSites, {
		status: statusSlug,
		showHidden: true,
	} );

	// Filter sites list by search query.
	const filteredSites = useSitesListFiltering( currentStatusGroup, {
		search: dataViewsState.search,
	} );

	// Perform sorting actions
	const sortedSites = useSitesListSorting( filteredSites, {
		sortKey: siteSortingKeys.find( ( key ) => key.dataView === dataViewsState.sort.field )
			?.sortKey as SitesSortKey,
		sortOrder: dataViewsState.sort.direction || undefined,
	} );

	const paginatedSites = sortedSites.slice(
		( dataViewsState.page - 1 ) * dataViewsState.perPage,
		dataViewsState.page * dataViewsState.perPage
	);

	// Reset selected feature when the component is re-mounted with different initial path.
	useEffect( () => {
		setSelectedSiteFeature( initialSiteFeature );
		setSelectedSiteSubfeature( initialSiteSubfeature );
	}, [ initialSiteFeature, initialSiteSubfeature ] );

	// Reset selected subfeature when feature changes.
	useEffect( () => {
		if ( selectedSiteFeature !== initialSiteFeature ) {
			setSelectedSiteSubfeature( selectedSiteFeature );
		}
	}, [ initialSiteFeature, selectedSiteFeature ] );

	// Update URL with view control params on change.
	useEffect( () => {
		const queryParams = {
			search: dataViewsState.search?.trim(),
			status: statusSlug === DEFAULT_STATUS_GROUP ? undefined : statusSlug,
			'per-page': dataViewsState.perPage === DEFAULT_PER_PAGE ? undefined : dataViewsState.perPage,
		};

		// There is a chance that the URL is not up to date when it mounts, so bump the
		// syncURL call to the back of the stack to avoid it getting the incorrect URL and
		// then redirecting back to the previous path.
		window.setTimeout( () =>
			syncURL(
				dataViewsState.selectedItem?.slug,
				selectedSiteParams,
				selectedSiteSubfeature,
				queryParams
			)
		);
	}, [
		dataViewsState.selectedItem?.slug,
		selectedSiteSubfeature,
		dataViewsState.search,
		dataViewsState.perPage,
		statusSlug,
	] );

	// Update site sorting preference on change
	useEffect( () => {
		if ( dataViewsState.sort.field ) {
			onSitesSortingChange( {
				sortKey: siteSortingKeys.find( ( key ) => key.dataView === dataViewsState.sort.field )
					?.sortKey as SitesSortKey,
				sortOrder: dataViewsState.sort.direction || 'asc',
			} );
		}
	}, [ dataViewsState.sort, onSitesSortingChange ] );

	// Manage the closing of the preview pane
	const closeSitePreviewPane = useCallback( () => {
		if ( dataViewsState.selectedItem ) {
			setDataViewsState( { ...dataViewsState, type: DATAVIEWS_TABLE, selectedItem: undefined } );
			//setHideListing( false );
		}
	}, [ dataViewsState, setDataViewsState ] );

	// todo: temporary mock data
	const hideListing = false;
	const isNarrowView = false;

	return (
		<Layout
			className={ classNames(
				'sites-dashboard',
				'sites-dashboard__layout',
				! dataViewsState.selectedItem && 'preview-hidden'
			) }
			wide
			title={ dataViewsState.selectedItem ? null : translate( 'Sites' ) }
		>
			<DocumentHead title={ __( 'Sites' ) } />

			{ ! hideListing && (
				<LayoutColumn className="sites-overview" wide>
					<LayoutTop withNavigation={ false }>
						<LayoutHeader>
							{ ! isNarrowView && <Title>{ translate( 'Sites' ) }</Title> }
							<Actions>
								<SitesDashboardHeader />
							</Actions>
						</LayoutHeader>
					</LayoutTop>

					<DocumentHead title={ __( 'Sites' ) } />
					<DotcomSitesDataViews
						sites={ paginatedSites }
						isLoading={ isLoading }
						paginationInfo={ getSitesPagination( filteredSites, perPage ) }
						dataViewsState={ dataViewsState }
						setDataViewsState={ setDataViewsState }
					/>
				</LayoutColumn>
			) }

			{ dataViewsState.selectedItem && (
				<LayoutColumn className="site-preview-pane" wide>
					<DotcomPreviewPane
						site={ dataViewsState.selectedItem }
						selectedSiteParams={ selectedSiteParams }
						selectedSiteFeature={ selectedSiteFeature }
						selectedSiteSubfeature={ selectedSiteSubfeature }
						setSelectedSiteFeature={ setSelectedSiteFeature }
						closeSitePreviewPane={ closeSitePreviewPane }
					/>
				</LayoutColumn>
			) }
		</Layout>
	);
};

export default SitesDashboardV2;
