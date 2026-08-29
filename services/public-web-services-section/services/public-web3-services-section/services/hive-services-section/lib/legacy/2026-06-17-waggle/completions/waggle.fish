# fish completion for waggle
# Install: copy to a fish completions directory, e.g.
#   cp completions/waggle.fish ~/.config/fish/completions/waggle.fish

# Only offer subcommands as the first argument.
function __waggle_needs_command
    set -l cmd (commandline -opc)
    test (count $cmd) -eq 1
end

function __waggle_using_command
    set -l cmd (commandline -opc)
    test (count $cmd) -ge 2; and test "$cmd[2]" = "$argv[1]"
end

# Reads (no keys)
complete -c waggle -f -n __waggle_needs_command -a globals      -d 'dynamic global properties'
complete -c waggle -f -n __waggle_needs_command -a refblock     -d 'ref_block_num / prefix / time'
complete -c waggle -f -n __waggle_needs_command -a account      -d 'account object'
complete -c waggle -f -n __waggle_needs_command -a content      -d 'condenser_api.get_content'
complete -c waggle -f -n __waggle_needs_command -a post         -d 'bridge.get_post'
complete -c waggle -f -n __waggle_needs_command -a ranked       -d 'ranked posts by tag'
complete -c waggle -f -n __waggle_needs_command -a posts        -d "an account's posts"
complete -c waggle -f -n __waggle_needs_command -a profile      -d 'social profile'
complete -c waggle -f -n __waggle_needs_command -a followers    -d 'accounts following an account'
complete -c waggle -f -n __waggle_needs_command -a following    -d 'accounts an account follows'
complete -c waggle -f -n __waggle_needs_command -a follow-count -d 'follower/following counts'
complete -c waggle -f -n __waggle_needs_command -a history      -d 'account operation history'

# Writes (need a key)
complete -c waggle -f -n __waggle_needs_command -a vote      -d 'vote on a post (posting)'
complete -c waggle -f -n __waggle_needs_command -a unvote    -d 'remove a vote (posting)'
complete -c waggle -f -n __waggle_needs_command -a publish   -d 'publish a post (posting)'
complete -c waggle -f -n __waggle_needs_command -a reply     -d 'reply (posting)'
complete -c waggle -f -n __waggle_needs_command -a transfer  -d 'transfer value (active)'
complete -c waggle -f -n __waggle_needs_command -a follow    -d 'follow (posting)'
complete -c waggle -f -n __waggle_needs_command -a unfollow  -d 'unfollow (posting)'
complete -c waggle -f -n __waggle_needs_command -a reblog    -d 'reblog (posting)'
complete -c waggle -f -n __waggle_needs_command -a claim     -d 'claim rewards (posting)'

# Util
complete -c waggle -f -n __waggle_needs_command -a pubkey -d 'derive STM pubkey from WIF (offline)'
complete -c waggle -f -n __waggle_needs_command -a whoami -d 'configured account + public keys'
complete -c waggle -f -n __waggle_needs_command -a help   -d 'usage summary'

# Second-argument vocabularies.
complete -c waggle -f -n '__waggle_using_command ranked' -a 'trending hot created payout muted'
complete -c waggle -f -n '__waggle_using_command posts'  -a 'blog feed posts replies'
