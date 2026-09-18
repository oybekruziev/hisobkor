import React from 'react';
import {hydrateRoot} from 'react-dom/client';
import {Landing} from './Landing';
hydrateRoot(document.getElementById('landing-root')!,<Landing/>);
