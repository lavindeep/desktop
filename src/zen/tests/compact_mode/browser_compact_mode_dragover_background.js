/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const LAYOUTS = [
  { singleToolbar: true, hideToolbar: false },
  { singleToolbar: false, hideToolbar: true },
  { singleToolbar: false, hideToolbar: false },
];

async function setCompactMode(value) {
  gZenCompactModeManager.preference = value;
  await TestUtils.waitForCondition(
    () =>
      gZenCompactModeManager.preference === value &&
      !document.documentElement.hasAttribute("zen-compact-animating"),
    "Compact mode finished toggling"
  );
  let lastTop;
  await TestUtils.waitForCondition(() => {
    const top = gNavToolbox.getBoundingClientRect().top;
    const settled = top === lastTop;
    lastTop = top;
    return settled;
  }, "The toolbox stopped moving");
}

add_task(async function test_dragover_background_covers_folder_label() {
  const folder = await gZenFolders.createFolder(
    [BrowserTestUtils.addTab(gBrowser, "about:blank", { skipAnimation: true })],
    { renameFolder: false, label: "test" }
  );
  const label = folder.labelElement.parentElement;

  registerCleanupFunction(async () => {
    gNavToolbox.removeAttribute("zen-user-show");
    await setCompactMode(false);
    const removed = BrowserTestUtils.waitForEvent(folder, "TabGroupRemoved");
    folder.delete();
    await removed;
  });

  for (const { singleToolbar, hideToolbar } of LAYOUTS) {
    const layout = `single toolbar: ${singleToolbar}, hide toolbar: ${hideToolbar}`;
    await setCompactMode(false);
    await SpecialPowers.pushPrefEnv({
      set: [
        ["zen.view.use-single-toolbar", singleToolbar],
        ["zen.view.compact.hide-tabbar", true],
        ["zen.view.compact.hide-toolbar", hideToolbar],
      ],
    });
    await setCompactMode(true);
    gNavToolbox.setAttribute("zen-user-show", "true");

    const draggedTab = BrowserTestUtils.addTab(gBrowser, "about:blank", {
      skipAnimation: true,
    });
    await TestUtils.waitForCondition(() => {
      const rect = draggedTab.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      );
      return hit?.closest(".tabbrowser-tab") === draggedTab;
    }, "The tab to drag is hit-testable");
    EventUtils.startDragSession(window, "move");
    const [result, dataTransfer] = EventUtils.synthesizeDragOver(
      draggedTab,
      label,
      null,
      "move",
      window,
      window
    );
    const background = document.getElementById("zen-dragover-background");
    ok(background, `Drag-over background is shown (${layout})`);
    const labelRect = label.getBoundingClientRect();
    const backgroundRect = background.getBoundingClientRect();
    Assert.less(
      Math.abs(
        backgroundRect.top +
          backgroundRect.height / 2 -
          (labelRect.top + labelRect.height / 2)
      ),
      1,
      `Drag-over background is centered on the folder label (${layout})`
    );

    EventUtils.synthesizeDropAfterDragOver(result, dataTransfer, label, window);
    window.windowUtils.dragSession?.endDragSession(true);
    BrowserTestUtils.removeTab(draggedTab);
    gNavToolbox.removeAttribute("zen-user-show");
    await SpecialPowers.popPrefEnv();
  }
});
