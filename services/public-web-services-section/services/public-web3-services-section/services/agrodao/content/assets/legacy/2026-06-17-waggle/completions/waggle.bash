# bash completion for waggle
# Install: source this file, or drop it in your bash-completion.d directory, e.g.
#   cp completions/waggle.bash /usr/share/bash-completion/completions/waggle

_waggle() {
    local cur prev words cword
    _init_completion 2>/dev/null || {
        cur="${COMP_WORDS[COMP_CWORD]}"
        prev="${COMP_WORDS[COMP_CWORD-1]}"
        cword=$COMP_CWORD
    }

    local commands="globals refblock account content post ranked posts profile \
        followers following follow-count history \
        vote unvote publish reply transfer follow unfollow reblog claim \
        pubkey whoami help"

    # First word: complete the subcommand.
    if [[ $cword -eq 1 ]]; then
        COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
        return
    fi

    # A few commands have a small fixed vocabulary for their first argument.
    case "${COMP_WORDS[1]}" in
        ranked)
            [[ $cword -eq 2 ]] && COMPREPLY=( $(compgen -W "trending hot created payout muted" -- "$cur") )
            ;;
        posts)
            [[ $cword -eq 3 ]] && COMPREPLY=( $(compgen -W "blog feed posts replies" -- "$cur") )
            ;;
    esac
}

complete -F _waggle waggle
complete -F _waggle waggle.mjs
