import _ from 'lodash'

function loadComponent (component) {
  return () => {
    // try first in core library
    return import(`kCore/lib/client/components/${component}.vue`)
      .catch(_ => {
        return import(`kTeam/lib/client/components/${component}.vue`)
          .catch(_ => {
            return import(`kNotify/lib/client/components/${component}.vue`)
              .catch(_ => {
                return import(`kMap/lib/client/components/${component}.vue`)
                  .catch(_ => {
                    // Otherwise this should be app component
                    return import(`@/${component}.vue`)
                  })
              })
          })
      })
  }
}

function loadSchema (schema) {
  return import(`kCore/lib/schemas/${schema}.json`)
    .catch(_ => {
      return import(`kTeam/lib/schemas/${schema}.json`)
      // FIXME: When we will have some schema here
      /*
      .catch(_ => {
        return import(`kMap/lib/schemas/${schema}.json`)
        .catch(_ => {
          // Otherwise this should be app component
          return import(`schemas/${schema}.json`)
        })
      })
      */
    })
}

function resolveAsset (asset) {
  return require('./assets/' + asset)
}

function buildRoutes (config) {
  function buildRoutesRecursively (config, routes, parentRoute) {
    _.forOwn(config, (value, key) => {
      // The key is always the path for the route
      let route = { path: key }
      // If value is a simple string this is a shortcut:
      // - name = path
      // - component = value
      // Otherwise we have an object similar to what expect vue-router,
      // we simply return the async component loading function with the given component value
      if (typeof value === 'string') {
        route.name = key
        route.component = loadComponent(value)
      }
      else {
        route.path = key || value.path
        route.name = value.name || route.path
        route.component = loadComponent(value.component)
        if (_.has(value, 'props')) {
          route.props = value.props
        }
      }
      // Check for public routes which are at top-level excpet everything under /home
      if (parentRoute && parentRoute.path === '/' && route.name !== 'home') {
        route.meta = { public: true }
      }
      // Check for any children to recurse
      if (value.children) {
        route.children = []
        buildRoutesRecursively(value.children, route.children, route)
      }
      routes.push(route)
    })
  }

  let routes = []
  buildRoutesRecursively(config, routes)
  return routes
}

let utils = {
  loadComponent,
  loadSchema,
  resolveAsset,
  buildRoutes
}

export default utils
