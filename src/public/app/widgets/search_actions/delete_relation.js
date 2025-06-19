import SpacedUpdate from "../../services/spaced_update.js";
import AbstractSearchAction from "./abstract_search_action.js";

const TPL = `
<tr>
    <td>
        Delete relation:
    </td>
    <td>
        <div style="display: flex; align-items: center">
            <input type="text" 
                class="form-control relation-name"                    
                pattern="[\\p{L}\\p{N}_:]+"
                placeholder="relation name"
                title="Alphanumeric characters, underscore and colon are allowed characters."/>
        </div>
    </td>
    <td class="button-column">
        <span class="bx bx-x icon-action action-conf-del"></span>
    </td>
</tr>`;

export default class DeleteRelationSearchAction extends AbstractSearchAction {
    static get actionName() { return "deleteRelation"; }

    doRender() {
        const $action = $(TPL);
        const $relationName = $action.find('.relation-name');
        $relationName.val(this.actionDef.relationName || "");

        const spacedUpdate = new SpacedUpdate(async () => {
            await this.saveAction({ relationName: $relationName.val() });
        }, 1000)

        $relationName.on('input', () => spacedUpdate.scheduleUpdate());

        return $action;
    }
}
