import React, { Component } from 'react';
import { graphql, gql } from 'react-apollo';
import { GC_USER_ID } from '../constants';
import { timeDifferenceForDate } from '../utils';

class Link extends Component {
  render() {
    const userId = localStorage.getItem(GC_USER_ID)
    console.log('--> render with count', this.props.link.votes.length)
    return (
      <div className='flex mt2 items-start'>
        <div className='flex items-center'>
          <span className='gray'>{this.props.index + 1}.</span>
          {userId && <div className='ml1 gray f11' onClick={() => this._voteForLink()}>▲</div>}
        </div>
        <div className='ml1'>
          <div>{this.props.link.description} ({this.props.link.url})</div>
          <div className='f6 lh-copy gray'>{this.props.link.votes.length} votes | by {this.props.link.postedBy ? this.props.link.postedBy.name : 'Unknown'} {timeDifferenceForDate(this.props.link.createdAt)}</div>
        </div>
      </div>
    )
  }

  _voteForLink = async () => {
    const userId = localStorage.getItem(GC_USER_ID)
    const voterIds = this.props.link.votes.map(vote => vote.user.id)
    if (voterIds.includes(userId)) {
      alert(`User (${userId}) already voted for this link.`)
      return
    }

    const linkId = this.props.link.id
    await this.props.createVoteMutation({
      variables: {
        userId,
        linkId
      },
      optimisticResponse: {
        __typename: 'Mutation',
        createVote: {
          __typename: 'Vote',
          id: '',
          link: {
            __typename: 'Link',
            votes: [
              ...this.props.link.votes,
              {
                __typename: 'Vote',
                id: '',
                user: {
                  __typename: 'User',
                  id: '',
                }
              }
            ]
          },
          user: this.props.link.postedBy,
        }
      },
      update: (store, { data: { createVote } }) => {
        // this.props.updateStoreAfterVote(store, createVote, linkId)
        console.log('update called after vote', createVote)
      }
    })
  }
}

const CREATE_VOTE_MUTATION = gql`
  mutation CreateVoteMutation($userId: ID!, $linkId: ID!) {
    createVote(userId: $userId, linkId: $linkId) {
      id
      link {
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
`
export default graphql(CREATE_VOTE_MUTATION, {
  name: 'createVoteMutation'
})(Link)
