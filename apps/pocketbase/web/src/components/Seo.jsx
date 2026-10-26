import React from 'react';
import { Helmet } from 'react-helmet';
import { LOGOS } from '@/lib/brand';

const SITE_URL = 'https://synvosa.com';

// Social + canonical tags only. The page's own <Helmet> must keep a literal
// <title> and <meta name="description">, because the llms.txt build step reads
// those two tags straight out of the page file's source.
const Seo = ({ title, description, image, url, siteName, type = 'website' }) => {
    const canonical = url || SITE_URL + window.location.pathname;
    const ogImage = image || LOGOS.enWide;

    return (
        <Helmet>
            <meta name="robots" content="index, follow" />
            <link rel="canonical" href={canonical} />
            <meta property="og:url" content={canonical} />
            <meta property="og:type" content={type} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:locale" content="en" />
            {siteName && <meta property="og:site_name" content={siteName} />}
            {title && <meta property="og:title" content={title} />}
            {description && <meta property="og:description" content={description} />}
            <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
            {title && <meta name="twitter:title" content={title} />}
            {description && <meta name="twitter:description" content={description} />}
            {ogImage && <meta name="twitter:image" content={ogImage} />}
        </Helmet>
    );
}

export default Seo;

export { Seo };
