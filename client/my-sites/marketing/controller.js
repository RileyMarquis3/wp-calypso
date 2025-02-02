import page from '@automattic/calypso-router';
import { translate } from 'i18n-calypso';
import { createElement } from 'react';
import SharingConnections from 'calypso/sites/marketing/connections/connections';
import SharingButtons from 'calypso/sites/marketing/sharing/buttons';
import MarketingTools from 'calypso/sites/marketing/tools';
import Traffic from 'calypso/sites/marketing/traffic/traffic';
import { errorNotice } from 'calypso/state/notices/actions';
import { fetchPreferences } from 'calypso/state/preferences/actions';
import { getPreference, hasReceivedRemotePreferences } from 'calypso/state/preferences/selectors';
import { canCurrentUser } from 'calypso/state/selectors/can-current-user';
import isSiteP2Hub from 'calypso/state/selectors/is-site-p2-hub';
import { setExpandedService } from 'calypso/state/sharing/actions';
import { requestSite } from 'calypso/state/sites/actions';
import { getSiteSlug } from 'calypso/state/sites/selectors';
import { getSelectedSiteId } from 'calypso/state/ui/selectors';
import Sharing from './main';

export const redirectConnections = ( context ) => {
	const serviceParam = context.params.service ? `?service=${ context.params.service }` : '';
	page.redirect( `/marketing/connections/${ context.params.domain }${ serviceParam }` );
};

export const redirectDefaultConnectionsDomain = async ( context ) => {
	const { getState, dispatch } = context.store;

	if ( ! hasReceivedRemotePreferences( getState() ) ) {
		await dispatch( fetchPreferences() );
	}
	const state = getState();

	const recentSiteId = getPreference( state, 'recentSites' )[ 0 ];

	let recentSiteSlug = getSiteSlug( state, recentSiteId );
	if ( ! recentSiteSlug ) {
		try {
			await dispatch( requestSite( recentSiteId ) );
		} catch {
			// proceed despite a failed site request
		}
		recentSiteSlug = getSiteSlug( getState(), recentSiteId );
		if ( ! recentSiteSlug ) {
			// TODO Maybe get the primary site slug, but for now redirect to site selection.
			page.redirect( '/marketing/connections' );
		}
	}
	context.params.domain = recentSiteSlug;
	redirectConnections( context );
};

export const redirectMarketingTools = ( context ) => {
	page.redirect( '/marketing/tools/' + context.params.domain );
};

export const redirectMarketingBusinessTools = ( context ) => {
	page.redirect( '/marketing/tools/' + context.params.domain );
};

export const redirectSharingButtons = ( context ) => {
	page.redirect( '/marketing/sharing-buttons/' + context.params.domain );
};

export const layout = ( context, next ) => {
	const { contentComponent, pathname } = context;

	context.primary = createElement( Sharing, { contentComponent, pathname } );

	next();
};

export const connections = ( context, next ) => {
	const { store } = context;
	const { dispatch } = store;
	dispatch( setExpandedService( context.query.service ) );

	const state = store.getState();
	const siteId = getSelectedSiteId( state );
	const isP2Hub = isSiteP2Hub( state, siteId );

	if ( siteId && ! canCurrentUser( state, siteId, 'publish_posts' ) ) {
		dispatch(
			errorNotice( translate( 'You are not authorized to manage sharing settings for this site.' ) )
		);
	}

	const siteSlug = getSiteSlug( state, siteId );

	context.contentComponent = createElement( SharingConnections, { isP2Hub, siteId, siteSlug } );

	next();
};

export const marketingTools = ( context, next ) => {
	context.contentComponent = createElement( MarketingTools );

	next();
};

export const sharingButtons = ( context, next ) => {
	const { store } = context;
	const state = store.getState();
	const siteId = getSelectedSiteId( state );

	if ( siteId && ! canCurrentUser( state, siteId, 'manage_options' ) ) {
		store.dispatch(
			errorNotice( translate( 'You are not authorized to manage sharing settings for this site.' ) )
		);
	}

	context.contentComponent = createElement( SharingButtons );

	next();
};

export const traffic = ( context, next ) => {
	context.contentComponent = createElement( Traffic );

	next();
};
