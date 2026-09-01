import random

import qtmud

import fyreside


class Card(object):
    """ The base class all other cards build off of.

        :param kwargs:      If any arguments are passed when Card() is called,
                            they'll be passed on as arguments to Card.update()
    """

    # TODO add: category setter which lower()s
    def __init__(self, **kwargs):
        self.name = 'Basic Card'
        """ The card's name can be used to reference the card within the
        game. If a ``name`` is more than one word, the last word can be used
        as an abbreviation."""
        self.owner = None
        """ The player who 'owns' the card. Ownership is an arbitrary game
        concept, and doesn't necessarily reflect the player whose hand the
        card is in."""
        self.rarity = 0
        """ Rarity defines how many of the card will be placed into the deck
        when the Fyreside game was :func:`load <fyreside.load>`ed. ``0``
        means the card won't be in the deck. In my head, rarity works out to:

        ============  ============
         ``rarity``    Descriptor
        ============  ============
              1       Unique
              2       Rare
              3       Uncommon
              4       Common
              5       Basic
        ============  ============
        """
        self.cost = 0
        """ How many :attr:`mana <fyreside.Player.mana>` it takes to play this
        card."""
        self.stats = dict()
        """ Cards which have concrete in-game attributes like "damage" store
        them inside the stats dict. """
        self.ability = None
        """ A short text description of what the card's play method does. """
        self.consumed = False
        """ If this is set to True, the card will be consumed when it's played.
        """
        self.series = 'beta'
        """ The run of cards this card is a part of. To be used in the future
        people can pick what groups of cards they want in their deck. """
        self.categories = list()
        """ A list of the categories the card falls into. Might be something
        like Spell or Creature, might also be something like Ork or
        Mechanical. """
        self.update(**kwargs)

    def update(self, **kwargs):
        """ ``for attr, value in kwargs.items(): self.__dict__[attr] = value``
        """
        for attr, value in kwargs.items():
            self.__dict__[attr] = value


class BasikOrk(Card):
    """ Cheap card that attacks a random player.

        .. versionadded:: 0.0.2
    """
    def __init__(self):
        super(BasikOrk, self).__init__()
        self.update(name='Basik Ork', rarity=5, cost=1, series='BattleSickle',
                    categories=['ork', 'creature'], stats={'damage': 2},
                    ability='Attacks a `random` player.')

    def play(self, player):
        victim = random.choice(fyreside.connected_players)
        victim.receive_damage(amount=self.stats['damage'], dealer=player)


class CaptainAhab(Card):
    """ Elemental Series Water Hero.

        .. versionadded:: 0.0.5
    """

    def __init__(self):
        super(CaptainAhab, self).__init__()
        self.update(name='Captain Ahab', rarity=1, cost=10, series='Elementary',
                    categories=['water', 'hero'],
                    ability='Passively doubles the strength of water spells, '
                            'then raises your maximum hand size by 1 if you '
                            'play him.')

    def play(self, player):
        player.max_hand += 1
        qtmud.schedule('send', recipient=player,
                       text='Before diving into the deck, Captain Ahab turns '
                            'to you and solemnly says, "You\'re going to need '
                            'a bigger boat." (+1 to maximum hand size)')


class ClockworkWeasel(Card):
    """ Sneakily reports its target's hand.

        .. versionadded:: 0.0.2
    """
    def __init__(self):
        super(ClockworkWeasel, self).__init__()
        self.update(name='Clockwork Weasel', rarity=4, cost=1,
                    series='Clockwork', categories=['clockwork', 'creature'],
                    ability='Secretly tells you an opponent\'s hand.')

    def play(self, player, target):
        output = ''
        spied_hand = '\n'.join([c.name for c in target.hand])
        output += ('You send your clockwork weasel scurrying toward `{}` '
                   'and after a moment, the weasel returns, showing you the '
                   'cards they have in their hand:\n{}'.format(target.name,
                                                               spied_hand))

        qtmud.schedule('send', recipient=player, text=output)


class ConvenientPortal(Card):
    """ Steals a random card from its target.

        .. versionadded:: 0.0.1
    """
    def __init__(self):
        super(ConvenientPortal, self).__init__()
        self.update(name='Convenient Portal', rarity=4, cost=3, series='Basic',
                    categories=['spell'],
                    ability='Steal a random `card` from `target`\'s hand.')

    def play(self, player, target):
        if target.hand:
            random.shuffle(target.hand)
            card = target.hand.pop()
            player.hand.append(card)
            card.owner = player
            qtmud.schedule('send', recipient=player,
                           text='You steal their `{}`'.format(card.name))
            qtmud.schedule('send', recipient=target,
                           text='`{}` steals your `{}`!'.format(player.name,
                                                                card.name))
        else:
            # TODO replace with raising Exception
            random.shuffle(fyreside.DECK)
            card = fyreside.DECK.pop()
            card.cost += -2
            player.hand.append(card)
            card.owner = player
            qtmud.schedule('send', recipient=player,
                           text='They didn\'t have any cards, '
                                'so we drew this {} and gave it `-2` '
                                'cost.'.format(card.name))


class Prometheus(Card):
    def __init__(self):
        super(Prometheus, self).__init__()
        self.update(name='Prometheus', rarity=1, cost=6, series='Elementary',
                    categories=['fire', 'hero'],
                    ability='Boosts fire damage, or max health when played.')

    def tweak_damage(self, damage):
        return int(damage * 2)

    def play(self, player):
        player.max_health += 1
        qtmud.schedule('send', recipient=player,
                       text='Prometheus adds kindling to your soul. +1 max '
                            'health.')


class Fireball(Card):
    """ Does a small amount of damage to its target

        .. versionadded:: 0.0.2
    """
    def __init__(self):
        super(Fireball, self).__init__()
        self.update(name='Fireball', rarity=5, cost=2, series='Elementary',
                    categories=['fire', 'spell'],
                    stats={'damage': 3})

    def play(self, player, target):
        damage = self.stats['damage']
        fire_heroes = fyreside.search_hand_by_categories(player,
                                                         categories=['hero',
                                                                     'fire'])
        if fire_heroes:
            for hero in fire_heroes:
                if hasattr(hero, 'tweak_damage'):
                    damage = hero.tweak_damage(damage)
        target.receive_damage(amount=damage, dealer=player)


class GreatFlood(Card):
    """ Puts a bunch of Nutritious Seaweed in the deck.

        .. versionadded:: 0.0.5
    """
    def __init__(self):
        super(GreatFlood, self).__init__()
        self.update(name='Great Flood', rarity=2, cost=12, series='Miracles',
                    categories=['water', 'spell'],
                    ability='Fills the deck with as many seaweed as you have '
                            'mana.')

    def play(self, player):
        mana = player.mana
        for _ in range(mana):
            fyreside.DECK.append(NutritiousSeaweed())
        qtmud.schedule('broadcast', channel='Fyreside', speaker=player,
                       message=('A great flood has filled the deck with {}'
                                'nutritious seaweed.'.format(mana)))


class Grunt(Card):
    """ Boosts the target's armor.

        .. versionadded:: 0.0.1

        This was the first Fyreside card.
    """
    def __init__(self):
        super(Grunt, self).__init__()
        self.update(name='Grunt', rarity=5, cost=1, series='Basic',
                    categories=['creature'], stats={'armor': 2},
                    ability='Slightly boosts the player\'s armor.')

    def play(self, player):
        player.receive_armor(amount=self.stats['armor'], dealer=player,
                             card=self)


class HamfistedOgre(Card):
    """ Does a fair amount of damage to its target - and half that to whoever
    plays it.

        .. versionadded:: 0.0.3
    """
    def __init__(self):
        super(HamfistedOgre, self).__init__()
        self.update(name='Hamfisted Ogre', rarity=3, cost=4, series='Basic',
                    categories=['creature'],
                    stats={'damage': 6})
        self.ability = ('Does {} to its target, but half as much to its '
                        'owner!'.format(self.stats['damage']))

    def play(self, player, target):
        damage = self.stats['damage']
        target.receive_damage(amount=damage, dealer=player)
        player.receive_damage(amount=damage / 2, dealer=player)


class Lightning(Card):
    """ Damages one player, and a second random player for half that.

        .. versionadded:: 0.0.5
    """

    def __init__(self):
        super(Lightning, self).__init__()
        self.update(name='Lightning', rarity=5, cost=4, series='Basic',
                    categories=['electric', 'spell'],
                    stats={'damage': 2})
        self.ability = 'Damages `target` and a random player for half that.'

    def play(self, player, target):
        damage = self.stats['damage']
        sucker = random.choice(fyreside.connected_players)
        target.receive_damage(amount=damage, dealer=player, card=self)
        sucker.receive_damage(amount=int(damage / 2), dealer=player, card=self)


class MysticGiant(Card):
    """ Heavily armors the player. Costs less the more cards you've played.

        .. versionadded:: 0.0.2
    """
    def __init__(self):
        super(MysticGiant, self).__init__()
        self.update(name='Mystic Giant', rarity=2, series='Basic',
                    categories=['creature'],
                    stats={'armor': 20})
        self._cost = 35
        return

    @property
    def cost(self):
        if self.owner:
            return self._cost - len(self.owner.history)
        return self._cost

    @cost.setter
    def cost(self, value):
        self._cost = value

    def play(self, player):
        armor = self.stats['armor']
        output = ('The mystic giant puts you on his shoulders, protecting you '
                  'from harm. (+{} armor)'.format(armor))
        player.receive_armor(amount=armor, dealer=player, card=self)
        qtmud.schedule('send', recipient=player, text=output)


class NutritiousSeaweed(Card):
    """ https://github.com/emsenn/fyreside/issues/11

        .. versionadded:: 0.0.5
    """

    def __init__(self):
        super(NutritiousSeaweed, self).__init__()
        self.update(name='Nutritious Seaweed', rarity=0, cost=0,
                    series='Miracles', categories=['food'],
                    ability='Restores 1 health and is destroyed.')

    def play(self, player):
        player.health += 1
        qtmud.schedule('send', recipient=player,
                       text='You eat the seaweed and its card.')
        self.consumed = True


class OrkBomber(Card):
    """ https://github.com/emsenn/fyreside/issues/11

        .. versionadded:: 0.0.5
    """
    def __init__(self):
        super(OrkBomber, self).__init__()
        self.update(name='Ork Bomber', rarity=2, cost=1, series='BattleSickle',
                    categories=['ork', 'creature'], stats={'damage': 6},
                    ability='Randomly attacks a player.')

    def play(self, player):
        victim = random.choice(fyreside.connected_players)
        victim.receive_damage(amount=self.stats['damage'], dealer=player)


class OrkFurnace(Card):
    """ https://github.com/emsenn/fyreside/issues/11 """

    def __init__(self):
        super(OrkFurnace, self).__init__()
        self.update(name='', rarity=0, cost=0)

    def play(self, player):
        return


class OrkGeneral(Card):
    """ https://github.com/emsenn/fyreside/issues/11

        .. versionadded:: 0.0.5
    """

    def __init__(self):
        super(OrkGeneral, self).__init__()
        self.update(name='', rarity=0, cost=0)

    def play(self, player):
        return


class OrkGunner(Card):
    """ https://github.com/emsenn/fyreside/issues/11

        .. versionadded:: 0.0.5
    """

    def __init__(self):
        super(OrkGunner, self).__init__()
        self.update(name='Ork Gunner', rarity=3, cost=1, series='BattleSickle',
                    categories=['ork', 'creature'], stats={'damage': 4},
                    ability='Randomly attacks a player.')

    def play(self, player):
        victim = random.choice(fyreside.connected_players)
        victim.receive_damage(amount=self.stats['damage'], dealer=player)


class OrkRecruiter(Card):
    """ https://github.com/emsenn/fyreside/issues/11 """

    def __init__(self):
        super(OrkRecruiter, self).__init__()
        self.update(name='', rarity=0, cost=0)

    def play(self, player):
        return


class OrkSergeant(Card):
    """ https://github.com/emsenn/fyreside/issues/11 """

    def __init__(self):
        super(OrkSergeant, self).__init__()
        self.update(name='', rarity=0, cost=0)

    def play(self, player):
        return


class Pablo(Card):
    """ Destroys `armor` and `mana` of one player. Gives some armor to
    everyone else.
    """
    def __init__(self):
        super(Pablo, self).__init__()
        self.update(name='Pablo', rarity=1, cost=7, series='As Seen On TV',
                    categories=['hero'], stats={'armor': 2},
                    ability='Destroys the `armor` and `mana` of one player, but'
                            'gives a few armor to everyone else. Pablo can\'t '
                            'his owner.')

    def play(self, player):
        """ Builds a list of connected players, shuffles it, and picks one
        to be the `victim`. That victim has their armor and mana zeroed, while
        every other player
        """
        players = fyreside.connected_players
        random.shuffle(players)
        victim = players.pop()
        if victim == self.owner:
            _victim = players.pop()
            players.append(victim)
            victim = _victim
        victim.receive_damage(amount=victim.armor, dealer=player, card=self)
        victim.receive_mana(amount=-victim.mana, dealer=player, card=self)
        for p in players:
            p.receive_armor(amount=self.stats['armor'], dealer=player,
                            card=self)


class PetulantChild(Card):
    """ Fully heals its target, but gets more expensive each time it's played.
    """
    def __init__(self):
        super(PetulantChild, self).__init__()
        self.update(name='Petulant Child', rarity=5, cost=0, series='Basic',
                    categories=['spell'],
                    ability=('Completely restore\'s `target`\'s health, '
                             'but its own cost goes up by one each time.'))

    def play(self, player, target):
        if not target:
            target = player
        target.health = target.max_health
        qtmud.schedule('send', recipient=player,
                       text=('You use your {} to heal {}'.format(self.name,
                                                                 target.name)))
        qtmud.schedule('send', recipient=target,
                       text=('{} heals you with their {}.'
                             ''.format(player.name,
                                       self.name)))
        self.cost += 1


class RecklessEngineer(Card):
    """ Gives its target four armor, then takes away two health.

        .. warning:: This card is broken atm, and won't show up in the deck.
    """

    def __init__(self):
        super(RecklessEngineer, self).__init__()
        self.update(name='Reckless Engineer', rarity=0, cost=4, series='Basic',
                    categories=['creature'],
                    stats={'repair': 4, 'damage': 2},
                    ability=('Gives `target` 4 armor... then takes away 2 '
                             'health.'))

    def play(self, player, target=None):
        if not target:
            target = player
        repair, damage = self.stats['repair'], self.stats['damage']
        target.receive_armor(amount=repair, dealer=player, card=self)
        target.health += -damage
        qtmud.schedule('send', recipient=target,
                       text=('While `{self.name}` was adding to your armor, it '
                             'did `{damage}` damage directly to your health, '
                             'so now you have `{target.health} health` and '
                             '`{target.armor} armor`.'.format(**locals())))


class RetirementParty(Card):
    """ https://github.com/emsenn/fyreside/issues/11 """

    def __init__(self):
        super(RetirementParty, self).__init__()
        self.update(name='', rarity=0, cost=0)

    def play(self, player):
        return


class ScoutBalloon(Card):
    """ Reports the stats & hand of every player.

        .. versionadded:: 0.0.3
    """
    def __init__(self):
        super(ScoutBalloon, self).__init__()
        self.update(name='Scout Balloon', rarity=4, cost=6, series='Basic',
                    categories=['creature'],
                    ability='Find the stats & hand of every player.')

    def play(self, player):
        reports = list()
        for target in fyreside.connected_players:
            hand_string = ', '.join([c.name for c in target.hand])
            reports.append('{target.name} has {target.health} health, '
                           '{target.armor} armor, {target.mana} mana, '
                           'and the following cards in their hand:'
                           '{hand_string}.'.format(**locals()))
            qtmud.schedule('send', recipient=player,
                           text='{} releases a scout balloon.'
                                ''.format(player.name))
        qtmud.schedule('send', recipient=player,
                       text='You receive the following reports from your '
                            'scout balloon:\n{}'
                            ''.format(' \n'.join(reports)))


class SecretSquirrel(Card):
    """ Sneakily reports the hand & stats of its target.

        .. versionadded:: 0.0.2
    """
    def __init__(self):
        super(SecretSquirrel, self).__init__()
        self.update(name='Secret Squirrel', rarity=4, cost=4, series='Basic',
                    categories=['creature'],
                    ability='Sneakily report stats & hand of a `target`')

    def play(self, player, target):
        hand_string = ', '.join([c.name for c in target.hand])
        output = ('{target.name} has {target.health} health, {target.armor} '
                  'armor, {target.mana} mana, and the following cards in '
                  'their hand: {hand_string}.'.format(**locals()))
        qtmud.schedule('send', recipient=player, text=output)


class Soda(Card):
    """ +1 health to everyone, +that much armor to the player. Consumed!

        .. versionadded:: 0.0.5
    """

    def __init__(self):
        super(Soda, self).__init__()
        self.update(name='Soda', rarity=5, cost=5, series='Snacks',
                    categories=['food'],
                    stats={'armor': 1, 'healing': 1},
                    ability=('Sends a bottle of soda to every player, giving '
                             'them one health. Then gives you 1 armor for '
                             'every player who received soda.'))

    def play(self, player):
        target_count = 0
        for target in fyreside.connected_players:
            if not target == player:
                healing = self.stats['healing']
                qtmud.schedule('send', recipient=target,
                               text=('`{}` sends you some soda:\n\n{}\n'
                                     'Your `health` goes up by `{}` and is now '
                                     '`{}`'.format(player.name,
                                                   fyreside.txt.SODA, healing,
                                                   player.health)))
                target.health += 1
                target_count += 1
        player.armor += target_count * self.stats['armor']
        qtmud.schedule('send', recipient=player,
                       text=('Share your soda with `{}` players, so you\'ve '
                             'gained that much armor'.format(target_count)))
        self.consumed = True


class Spam(Card):
    """ +1 health to everyone, +that much mana to the player. Consumed! """
    def __init__(self):
        super(Spam, self).__init__()
        self.update(name='Spam', rarity=5, cost=6, series='Snacks',
                    categories=['food'],
                    stats={'armor': 1},
                    ability=('Sends a message to every player, and gives you '
                             'one armor for every player it hits.'))

    def play(self, player):
        target_count = 0
        for target in fyreside.connected_players:
            if not target == player:
                qtmud.schedule('send', recipient=target,
                               text=('`{}` sends you some SPAM:\n\n{}'
                                     ''.format(player.name,
                                               fyreside.txt.SPAM)))
                target_count += 1
                target.receive_armor(amount=1, dealer=player, card=self)
        player.receive_mana(amount=target_count, dealer=player, card=self)
        qtmud.schedule('send', recipient=player,
                       text=('Hit {} players with your SPAM, so you\'ve '
                             'gained that much mana'.format(target_count)))
        self.consumed = True
