import React from 'react';
import { Helmet } from 'react-helmet';

const JsonLd = ({ data }) => {
  const items = Array.isArray(data) ? data : [data];
  return (
    <Helmet>
      {items.map((d, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(d)}
        </script>
      ))}
    </Helmet>
  );
};

export default JsonLd;

export { JsonLd };
