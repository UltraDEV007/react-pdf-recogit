import React, { useEffect, useRef, useState } from 'react';
import * as PDFJS from 'pdfjs-dist/legacy/build/pdf';
import { Recogito } from '@recogito/recogito-js/src';
import { Annotorious } from '@recogito/annotorious/src';

import 'pdfjs-dist/web/pdf_viewer.css';
import '@recogito/recogito-js/dist/recogito.min.css';

/** Splits annotations by type, text or image **/
const splitByType = annotations => {
  let text = [];
  let image = [];

  annotations.forEach(a => {
    if (a.target.selector) {
      const selectors = Array.isArray(a.target.selector) ?
        a.target.selector : [ a.target.selector ];
      
      const hasImageSelector =
        selectors.find(s => s.type === 'FragmentSelector' || s.type === 'SvgSelector');

      if (hasImageSelector)
        image.push(a);
      else
        text.push(a);
    } else {
      // Relationship
      text.push(a);
    }
  });

  return { text, image };
}

const AnnotatablePage = props => {

  const containerEl = useRef();

  const [ anno, setAnno ] = useState();

  const [ recogito, setRecogito ] = useState();

  // Cleanup previous Recogito instance, canvas + text layer
  const destroyPreviousPage = () => {
    // Clean up previous Recogito + Annotorious instance, if any
    if (recogito)
      recogito.destroy();

    if (anno)
      anno.destroy();

    const canvas = containerEl.current.querySelector('canvas');
    if (canvas)
      containerEl.current.removeChild(canvas);

    const textLayer = containerEl.current.querySelector('.textLayer');
    textLayer.innerHTML = '';
  }

  // Render on page change
  useEffect(() => {
    destroyPreviousPage();

    if (props.page) {
      const scale = props.scale || 1.8;
      const viewport = props.page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      containerEl.current.appendChild(canvas);

      const renderContext = {
        canvasContext: canvas.getContext('2d'),
        viewport
      };

      props.page.render(renderContext);

      props.page.getTextContent().then(textContent => PDFJS.renderTextLayer({
        textContent: textContent,
        container: containerEl.current.querySelector('.textLayer'),
        viewport: viewport,
        textDivs: []
      }).promise.then(() => {
        const config = props.config || {};

        const { text, image } = splitByType(props.annotations);

        const r = new Recogito({ 
          ...config,
          content: containerEl.current.querySelector('.textLayer'), 
          mode: 'pre' 
        });

        r.on('createAnnotation', a => props.onCreateAnnotation(a));
        r.on('updateAnnotation', (a, p) => props.onUpdateAnnotation(a, p));
        r.on('deleteAnnotation', a => props.onDeleteAnnotation(a));

        // TODO split: text annotations only
        r.setAnnotations(text);
        setRecogito(r);

        const anno = new Annotorious({
          image: canvas
        });

        anno.on('createAnnotation', a => props.onCreateAnnotation(a));
        anno.on('updateAnnotation', (a, p) => props.onUpdateAnnotation(a, p));
        anno.on('deleteAnnotation', a => props.onDeleteAnnotation(a));

        anno.setAnnotations(image);
        setAnno(anno);

        r.on('selectAnnotation', () => anno.selectAnnotation());
        // TODO need an API method that does the same for RecogiotJS!
      }));
    }
  }, [ props.page ]);

  useEffect(() => {
    // Hack
    if (recogito && recogito.getAnnotations() === 0) {
      recogito.setAnnotations(props.annotations);
    }
  }, [ props.annotations ]);

  useEffect(() => {
    if (containerEl.current) {
      const imageLayer = containerEl.current.querySelector('svg.a9s-annotationlayer');
      
      if (imageLayer) {
        if (props.annotationMode === 'IMAGE') {
          imageLayer.style.pointerEvents = 'auto';
        } else {
          imageLayer.style.pointerEvents = null;
          recogito.setMode(props.annotationMode);
        }
      }
    }
  }, [ props.annotationMode ])

  return (
    <div
      ref={containerEl} 
      className={props.debug ? 'page-container debug' : 'page-container'}>
      <div className="textLayer" />
    </div>
  )

}

export default AnnotatablePage;