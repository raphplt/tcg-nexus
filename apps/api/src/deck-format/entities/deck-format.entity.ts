import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import { Deck } from "src/deck/entities/deck.entity";

@Entity()
export class DeckFormat {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true })
    type: string

    @Column({ type: 'date', nullable: true })
    startDate: string

    @Column({ type: 'date', nullable: true })
    endDate: string

    @OneToMany(() => Deck, (deck) => deck.format)
    decks: Deck[];
}