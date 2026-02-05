import React, {type ReactNode} from 'react';
import type {Props} from '@theme/Footer/Layout';

export default function FooterLayout({
  links,
  logo,
  copyright,
}: Props): ReactNode {
  return (
    <footer className="footer">
      <div className="container container-fluid">
        {links}
        {(logo || copyright) && (
          <div className="footer__bottom text--center">
            {logo && <div className="margin-bottom--sm">{logo}</div>}
            {copyright}
          </div>
        )}
      </div>
    </footer>
  );
}
