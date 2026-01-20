import PromocodeInput from './PromocodeInput';
import QuestsList from './QuestsList';

export default function GetFreeMessagesTab() {
  return (
    <div className="flex flex-col gap-5">
      <PromocodeInput />
      <hr></hr>
      <QuestsList />
    </div>
  );
}
