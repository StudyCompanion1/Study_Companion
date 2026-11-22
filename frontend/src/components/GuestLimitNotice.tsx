import {Button} from './Button'
import {Notice} from './Notice'
import './GuestLimitNotice.css'

// Shown when guest has used up all usage of certain features, also offers the sign-up form
export function GuestLimitNotice({message, onSignUp}: {message: string; onSignUp: () => void}) {
    return (
        <div className = "guest-limit">
            <Notice tone="info" title="Guest limit reached">
                {message}
            </Notice>
            <Button type="button" variant="primary" onClick={onSignUp}>
                Create a free account
            </Button>
        </div>
    )
}