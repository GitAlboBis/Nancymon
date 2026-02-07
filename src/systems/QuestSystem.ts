import { GameState } from '../state/GameState';
import { QUESTS, INITIAL_QUEST_ID } from '../data/Quests';

export type QuestUpdateType = 'START' | 'OBJECTIVE' | 'COMPLETE';

export class QuestSystem {
    private static instance: QuestSystem;

    // Callback for UI notifications
    private onQuestUpdate: ((type: QuestUpdateType, message: string) => void) | null = null;

    static getInstance(): QuestSystem {
        if (!QuestSystem.instance) {
            QuestSystem.instance = new QuestSystem();
        }
        return QuestSystem.instance;
    }

    setNotificationCallback(callback: (type: QuestUpdateType, message: string) => void) {
        this.onQuestUpdate = callback;
    }

    startInitialQuest(): void {
        if (!GameState.activeQuestId && GameState.completedQuestIds.length === 0) {
            this.startQuest(INITIAL_QUEST_ID);
        }
    }

    startQuest(questId: string): void {
        const quest = QUESTS[questId];
        if (!quest) return;

        GameState.startQuest(questId);
        this.notify('START', `New Quest: ${quest.title}`);
    }

    completeObjective(questId: string, objectiveIndex: number): void {
        // Only allow completing objectives for the active quest OR recently completed quests (idempotency)
        const quest = QUESTS[questId];
        if (!quest) return;

        // If it's the active quest, proceed
        if (GameState.activeQuestId !== questId) {
            // Can't update non-active quests
            return;
        }

        const isNew = GameState.completeObjective(questId, objectiveIndex);
        if (isNew) {
            const objectiveText = quest.objectives[objectiveIndex];
            this.notify('OBJECTIVE', `Completed: ${objectiveText}`);

            this.checkQuestCompletion(questId);
        }
    }

    private checkQuestCompletion(questId: string): void {
        const quest = QUESTS[questId];
        const allComplete = quest.objectives.every((_, index) =>
            GameState.isObjectiveCompleted(questId, index)
        );

        if (allComplete) {
            GameState.completeQuest(questId);
            this.notify('COMPLETE', `Quest Completed: ${quest.title}`);

            // Start next quest if available
            if (quest.nextQuestId) {
                // Small delay for pacing
                setTimeout(() => {
                    this.startQuest(quest.nextQuestId!);
                }, 2500);
            }
        }
    }

    private notify(type: QuestUpdateType, message: string): void {
        console.log(`[QuestSystem] ${type}: ${message}`);
        if (this.onQuestUpdate) {
            this.onQuestUpdate(type, message);
        }
    }
}
