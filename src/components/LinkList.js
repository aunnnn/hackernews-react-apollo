import React, { Component } from 'react';
import { graphql, gql } from 'react-apollo';
import Link from './Link';
import { GC_USER_ID, GC_AUTH_TOKEN, LINKS_PER_PAGE } from '../constants'

class LinkList extends Component {

  componentDidMount() {
    this._subscribeToNewLinks()
    this._subscribeToNewVotes()
  }

  render() {

    if (this.props.allLinksQuery && this.props.allLinksQuery.loading) {
      return <div>Loading</div>
    }

    if (this.props.allLinksQuery && this.props.allLinksQuery.error) {
      return <div>Error</div>
    }

    const isNewPage = this.props.location.pathname.includes('new')
    const linksToRender = this._getLinksToRender(isNewPage)
    const userId = localStorage.getItem(GC_USER_ID)

    return (
      <div>
        {!userId ?
          <button onClick={() => {
            this.props.history.push('/login')
          }}>Login</button> :
          <div>
            <button onClick={() => {
              this.props.history.push('/create')
            }}>New Post</button>
            <button onClick={() => {
              localStorage.removeItem(GC_USER_ID)
              localStorage.removeItem(GC_AUTH_TOKEN)
              this.forceUpdate() // doesn't work as it should :(
            }}>Logout</button>
          </div>
        }
        <div>
          {linksToRender.map((link, index) => (
            <Link key={link.id} updateStoreAfterVote={this._updateCacheAfterVote} link={link} index={index}/>
          ))}
        </div>
        {isNewPage &&
        <div>
          <button onClick={() => this._previousPage()}>Previous</button>
          <button onClick={() => this._nextPage()}>Next</button>
        </div>
        }
      </div>
    )

  }

  _subscribeToNewLinks = () => {
    this.props.allLinksQuery.subscribeToMore({
      document: gql`
        subscription {
          Link(filter: {
            mutation_in: [CREATED]
          }) {
            node {
              id
              url
              description
              createdAt
              postedBy {
                id
                name
              }
              votes {
                id
                user {
                  id
                }
              }
            }
          }
        }
      `,
      updateQuery: (previous, { subscriptionData }) => {

        console.log('new link received!', subscriptionData.data.Link.node.url)

        // merge old + new for allLinks (inside previous.allLinks)
        const newAllLinks = [
          subscriptionData.data.Link.node,
          ...previous.allLinks
        ]

        // plug the result back into original object
        const result = {
          ...previous,
          allLinks: newAllLinks
        }
        return result
      }
    })
  }


  _subscribeToNewVotes = () => {
    this.props.allLinksQuery.subscribeToMore({
      document: gql`
        subscription {
          Vote(filter: {
            mutation_in: [CREATED]
          }) {
            node {
              id
              link {
                id
                url
                description
                createdAt
                postedBy {
                  id
                  name
                }
                votes {
                  id
                  user {
                    id
                  }
                }
              }
              user {
                id
              }
            }
          }
        }
      `,
      updateQuery: (previous, { subscriptionData }) => { // how store should be updated with data from server

        console.log('new vote received!')
        return;
        const votedLinkIndex = previous.allLinks.findIndex(link => link.id === subscriptionData.data.Vote.node.link.id)
        const link = subscriptionData.data.Vote.node.link
        const newAllLinks = previous.allLinks.slice()
        newAllLinks[votedLinkIndex] = link
        const result = {
          ...previous,
          allLinks: newAllLinks
        }
        return result
      }
    })
  }

  // is this redundant of the real-time subscriptions above?
  // Doesn't the cache store of votes should update on its own?
  _updateCacheAfterVote = (store, createVote, linkId) => {

    const isNewPage = this.props.location.pathname.includes('new')
    const page = parseInt(this.props.match.params.page, 10)
    const skip = isNewPage ? (page-1) * LINKS_PER_PAGE : 0
    const first = isNewPage ? LINKS_PER_PAGE : 100
    const orderBy = isNewPage ? "createdAt_DESC" : null

    console.log('update cache after vote.')

    // 1 - read cache data
    const data = store.readQuery({
      query: ALL_LINKS_QUERY,
      variables: { first, skip, orderBy }
    })

    // 2 - update
    const votedLink = data.allLinks.find(link => link.id === linkId)
    votedLink.votes = createVote.link.votes

    // 3 - write back to store
    store.writeQuery({ query: ALL_LINKS_QUERY, data })
  }

  _getLinksToRender = (isNewPage) => {
    if (isNewPage) {
      return this.props.allLinksQuery.allLinks
    }
    const rankedLinks = this.props.allLinksQuery.allLinks.slice()
    rankedLinks.sort((l1, l2) => l2.votes.length - l1.votes.length)
    return rankedLinks
  }

  _nextPage = () => {
    const page = parseInt(this.props.match.params.page, 10)
    if (page <= this.props.allLinksQuery._allLinksMeta.count / LINKS_PER_PAGE) {
      const nextPage = page + 1
      this.props.history.push(`/new/${nextPage}`)
    }
  }

  _previousPage = () => {
    const page = parseInt(this.props.match.params.page, 10)
    if (page > 1) {
      const previousPage = page - 1
      this.props.history.push(`/new/${previousPage}`)
    }
  }
}

export const ALL_LINKS_QUERY = gql`
  query AllLinksQuery($first: Int, $skip: Int, $orderBy: LinkOrderBy) {
    allLinks(first: $first, skip: $skip, orderBy: $orderBy) {
      id
      createdAt
      url
      description
      postedBy {
        id
        name
      }
      votes {
        id
        user {
          id
        }
      }
    }
    _allLinksMeta {
      count
    }
  }
`
// make allLinksQuery available in this.props
export default graphql(ALL_LINKS_QUERY, {
  name: 'allLinksQuery',
  options: (ownProps) => {
    // options here can be either object or function (in which case, it makes props available to use as seen here)!

    //  get props before executing the query
    //  then use it to calcuate variables
    const page = parseInt(ownProps.match.params.page, 10)
    const isNewPage = ownProps.location.pathname.includes('new')
    const skip = isNewPage ? (page - 1) * LINKS_PER_PAGE : 0
    const first = isNewPage ? LINKS_PER_PAGE : 100
    const orderBy = isNewPage ? 'createdAt_DESC' : null
    return {
      variables: { first, skip, orderBy }
    }
  }
}) (LinkList);

