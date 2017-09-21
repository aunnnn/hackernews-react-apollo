import React, { Component } from 'react'
import { GC_USER_ID, GC_AUTH_TOKEN } from '../constants'
import { gql, graphql, compose } from 'react-apollo'

class Login extends Component {

  constructor(props) {
    super(props)
    this.state = {
      login: true,
      email: '',
      password: '',
      name: '',
    }
    this._confirm = this._confirm.bind(this)
  }

  render() {

    return (
      <div>
        <h4 className='mv3'>{this.state.login ? 'Login' : 'Sign Up'}</h4>
        <div className='flex flex-column'>
          {!this.state.login &&
          <input
            value={this.state.name}
            onChange={(e) => this.setState({ name: e.target.value })}
            type='text'
            placeholder='Your name'
          />}
          <input
            value={this.state.email}
            onChange={(e) => this.setState({ email: e.target.value })}
            type='text'
            placeholder='Your email address'
          />
          <input
            value={this.state.password}
            onChange={(e) => this.setState({ password: e.target.value })}
            type='password'
            placeholder='Choose a safe password'
          />
        </div>
        <div className='flex mt3'>
          <div
            className='pointer mr2 button'
            onClick={this._confirm}
          >
            {this.state.login ? 'login' : 'create account' }
          </div>
          <div
            className='pointer button'
            onClick={() => this.setState({ login: !this.state.login })}
          >
            {this.state.login ? 'need to create an account?' : 'already have an account?'}
          </div>
        </div>
      </div>
    )
  }

  _confirm = async () => {
    if (this.state.login) {
      const { name, email, password } = this.state
      const result = await this.props.signinUserMutation({
        variables: {
          email,
          password
        }
      })
      const _id = result.data.signinUser.user.id
      const _token = result.data.signinUser.token
      const _name = result.data.signinUser.user.name
      this._saveUserData(_id, _token, _name)
    } else {
      const { name, email, password } = this.state
      const result = await this.props.createUserMutation({
        variables: {
          name,
          email,
          password
        }
      })
      const _id = result.data.signinUser.user.id
      const _token = result.data.signinUser.token
      const _name = result.data.signinUser.user.name
      this._saveUserData(_id, _token, _name)
    }
    this.props.history.push(`/`)
  }

  _saveUserData = (id, token, username) => {
    localStorage.setItem(GC_USER_ID, id)
    localStorage.setItem(GC_AUTH_TOKEN, token)
    localStorage.setItem('username', username)
  }

}



const CREATE_USER_MUTATION = gql`
  mutation CreateUserMutation($name: String!, $email: String!, $password: String!) {
    createUser(
      name: $name,
      authProvider: {
        email: {
          email: $email,
          password: $password
        }
      }
    ) {
      id
    }

    signinUser(email: {
      email: $email,
      password: $password
    }) {
      token
      user {
        id
        name
      }
    }
  }
`

const SIGNIN_USER_MUTATION = gql`
  mutation SigninUserMutation($email: String!, $password: String!) {
    signinUser(email: {
      email: $email,
      password: $password
    }) {
      token
      user {
        id
        name
      }
    }
  }
`

export default compose(
  graphql(CREATE_USER_MUTATION, { name: 'createUserMutation' }),
  graphql(SIGNIN_USER_MUTATION, { name: 'signinUserMutation' })
)(Login)

