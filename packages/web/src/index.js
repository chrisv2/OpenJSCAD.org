
function makeJscad (targetElement, options) {
  const bel = require('bel')

  const jscadEl = bel`<div class='jscad'></div>`
  targetElement.appendChild(jscadEl)

  const path = require('path')
  const most = require('most')
  const {proxy} = require('most-proxy')
  const {makeState} = require('./state')
  const makeCsgViewer = require('@jscad/csg-viewer')
  let csgViewer

// all the side effects : ie , input/outputs
  const storage = require('./sideEffects/localStorage')()
// title bar side effect
  const titleBar = require('@jscad/core/sideEffects/titleBar')()
// drag & drop side effect
  const dragDrop = require('@jscad/core/sideEffects/dragDrop')()
// dom side effect
  const dom = require('@jscad/core/sideEffects/dom')({targetEl: jscadEl})
// worker side effect
  const makeWorkerEffect = require('@jscad/core/sideEffects/worker')

// internationalization side effect
  const absFooHorror = '/Users/kraftwerk-mb/dev/projects/openjscad/core/tmp/OpenJSCAD.org/packages/web/web/'
  const localesPath = path.resolve(absFooHorror, path.join(absFooHorror, '..', 'locales'))
  console.log('localesPath', localesPath)
  const i18n = require('@jscad/core/sideEffects/i18n')({localesPath})
// web workers
  const foo = require('./core/code-evaluation/rebuildSolidsWorker.js')// require(workerPath)//path.resolve
  const solidWorker = makeWorkerEffect(foo)
// generic design parameter handling
  const paramsCallbacktoStream = require('@jscad/core/observable-utils/callbackToObservable')()

// proxy state stream to be able to access & manipulate it before it is actually available
  const { attach, stream } = proxy()
  const state$ = stream

// all the sources of data
  const sources = {
    state$,
    paramChanges: paramsCallbacktoStream.stream,
    store: storage.source(),
    drops: dragDrop.source(document),
    dom: dom.source(),
    solidWorker: solidWorker.source(),
    i18n: i18n.source()
  }

// all the actions
  const designActions = require('./ui/design/actions')(sources)
  const ioActions = require('./ui/io/actions')(sources)
  const viewerActions = require('./ui/viewer/actions')(sources)
  const otherActions = require('./ui/actions')(sources)
  const actions$ = Object.assign({}, designActions, otherActions, ioActions, viewerActions)

  attach(makeState(Object.values(actions$)))

// viewer data
  state$
  .filter(state => state.design.mainPath !== '')
  .skipRepeatsWith(function (state, previousState) {
    // const sameParamDefinitions = JSON.stringify(state.design.paramDefinitions) === JSON.stringify(previousState.design.paramDefinitions)
    // const sameParamValues = JSON.stringify(state.design.paramValues) === JSON.stringify(previousState.design.paramValues)
    const sameSolids = state.design.solids.length === previousState.design.solids.length &&
    JSON.stringify(state.design.solids) === JSON.stringify(previousState.design.solids)
    return sameSolids
  })
  .forEach(state => {
    if (csgViewer !== undefined) {
      csgViewer(undefined, {solids: state.design.solids})
    }
  })

  const outToDom$ = state$
  .skipRepeatsWith(function (state, previousState) {
    const sameParamDefinitions = JSON.stringify(state.design.paramDefinitions) === JSON.stringify(previousState.design.paramDefinitions)
    const sameParamValues = JSON.stringify(state.design.paramValues) === JSON.stringify(previousState.design.paramValues)

    const sameInstantUpdate = state.instantUpdate === previousState.instantUpdate

    const sameExportFormats = state.exportFormat === previousState.exportFormat &&
      state.availableExportFormats === previousState.availableExportFormats

    const sameStyling = state.themeName === previousState.themeName

    const sameAutoreload = state.autoReload === previousState.autoReload

    const sameError = JSON.stringify(state.error) === JSON.stringify(previousState.error)
    const sameStatus = state.busy === previousState.busy

    const sameShowOptions = state.showOptions === previousState.showOptions
    const samevtreeMode = state.vtreeMode === previousState.vtreeMode

    const sameAppUpdates = JSON.stringify(state.appUpdates) === JSON.stringify(previousState.appUpdates)

    const sameLocale = state.locale === previousState.locale
    const sameAvailableLanguages = state.availableLanguages === previousState.availableLanguages

    const sameShortcuts = state.shortcuts === previousState.shortcuts

    return sameParamDefinitions && sameParamValues && sameExportFormats && sameStatus && sameStyling &&
      sameAutoreload && sameInstantUpdate && sameError && sameShowOptions && samevtreeMode && sameAppUpdates &&
      sameLocale && sameAvailableLanguages && sameShortcuts
  })
  .map(function (state) {
    return require('./ui/views/main')(state, paramsCallbacktoStream)
  })
  /* .combine(function (state, i18n) {
    console.log('here')
    return require('./ui/views/main')(state, paramsCallbacktoStream, i18n)
  }, sources.i18n.filter(x => x.operation === 'changeSettings').map(x => x.data))
  */
  dom.sink(outToDom$)

  state$
  .map(state => state.viewer)
  .skipRepeatsWith(function (state, previousState) {
    const sameViewerParams = JSON.stringify(state) === JSON.stringify(previousState)
    return sameViewerParams
  })
  .forEach(params => {
    const viewerElement = document.getElementById('renderTarget')
    // initialize viewer if it has not been done already
    if (viewerElement && !csgViewer) {
      const csgViewerItems = makeCsgViewer(viewerElement, params)
      csgViewer = csgViewerItems.csgViewer
    }
    if (csgViewer) {
      csgViewer(params)
    }
  })

  return {}
}

module.exports = makeJscad