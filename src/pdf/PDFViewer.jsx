import React, { useEffect, useState } from 'react';
import * as PDFJS from 'pdfjs-dist/legacy/build/pdf';
import { CgDebug, CgChevronLeft, CgChevronRight, CgArrowsExpandDownRight } from 'react-icons/cg';

import Store from './AnnotationStore';
import AnnotatablePage from './AnnotatablePage';

import './PDFViewer.css';

const store = new Store();

/** 
 * Helper to insert the page index into the annotation target
 */
const extendTarget = (annotation, page) => ({
    ...annotation,
    target: {
      selector: annotation.target.selector.map(selector =>
        selector.type === 'TextPositionSelector' ?  
          { ...selector, page } : selector)
    }
  }
)

const PDFViewer = props => {

  const [ pdf, setPdf ] = useState();

  const [ page, setPage ] = useState();

  const [ annotations, setAnnotations ] = useState([]);

  const [ debug, setDebug ] = useState(false);

  const [ annotationMode, setAnnotationMode ] = useState('ANNOTATION');

  // Load PDF on mount
  useEffect(() => {
    PDFJS.getDocument(props.url).promise
      .then(
        pdf => setPdf(pdf), 
        error => console.error(error)
      );
  }, []);

  // Render first page when PDF loaded
  useEffect(() => {
    if (pdf) {
      pdf.getPage(1).then(setPage);
      setAnnotations(store.getAnnotations(1));
    }
  }, [ pdf ]);

  useEffect(() => {
    store.setAnnotations(props.annotations || []);

    if (page)
      setAnnotations(store.getAnnotations(page.pageNumber));
    else
      setAnnotations([]);
  }, [ props.annotations ])

  const onPreviousPage = () => {
    const { pageNumber } = page;
    const prevNum = Math.max(0, pageNumber - 1);
    if (prevNum !== pageNumber)
      pdf.getPage(prevNum).then(page => setPage(page));
  }

  const onNextPage = () => {
    const { numPages } = pdf;
    const { pageNumber } = page;
    const nextNum = Math.min(pageNumber + 1, numPages);
    if (nextNum !== pageNumber)
      pdf.getPage(nextNum).then(page => setPage(page));
  }

  const onToggleMode = () => {
    if (annotationMode === 'ANNOTATION')
      setAnnotationMode('RELATIONS')
    else 
      setAnnotationMode('ANNOTATION');
  }

  const onCreateAnnotation = a => {
    // Insert page number in target
    const extended = extendTarget(a, page.pageNumber);

    // Store in memory
    store.createAnnotation(extended);

    console.log(JSON.stringify(extended));

    // Trigger outside event handler, if any
    props.onCreateAnnotation && props.onCreateAnnotation(extended);
  }

  const onUpdateAnnotation = (a, p) => {
    const updated = extendTarget(a, page.pageNumber);
    const previous = extendTarget(p, page.pageNumber);

    store.updateAnnotation(updated, previous);

    props.onUpdateAnnotation && props.onUpdateAnnotation(updated, previous);
  }
    
  const onDeleteAnnotation = a => {
    const extended = extendTarget(a, page.pageNumber);
    store.deleteAnnotation(extended);
    props.onDeleteAnnotation && props.onDeleteAnnotation(extended);
  }
  
  return (
    <div>
      <header>
        <button onClick={() => setDebug(!debug)}>
          <span className="inner">
            <CgDebug />
          </span>
        </button>

        <button onClick={onPreviousPage}>
          <span className="inner">
            <CgChevronLeft />
          </span>
        </button>

        <label>{page?.pageNumber} / {pdf?.numPages}</label>
        
        <button onClick={onNextPage}>
          <span className="inner">
            <CgChevronRight />
          </span>
        </button>

        <button className={annotationMode === 'RELATIONS' ? 'active' : null} onClick={onToggleMode}>
          <span className="inner">
            <CgArrowsExpandDownRight />
          </span>
        </button>
      </header>

      <main>
        <div className="pdf-viewer-container">
          <AnnotatablePage 
            page={page} 
            annotations={annotations}
            config={props.config}
            debug={debug} 
            annotationMode={annotationMode} 
            onCreateAnnotation={onCreateAnnotation}
            onUpdateAnnotation={onUpdateAnnotation}
            onDeleteAnnotation={onDeleteAnnotation} />
        </div>
      </main>
    </div>
  )

}

export default PDFViewer;