/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { PromptTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PromptTestUtils.sys.mjs"
);

const BEFOREUNLOAD_URL =
  "https://example.com/document-builder.sjs?html=" +
  encodeURIComponent("<script>onbeforeunload = () => true;</script>");

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["dom.require_user_interaction_for_beforeunload", false]],
  });
});

async function openBeforeUnloadGlance() {
  const glanceTab = await gZenGlanceManager.openGlance({
    url: BEFOREUNLOAD_URL,
    clientX: 0,
    clientY: 0,
    width: 0,
    height: 0,
    triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
  });
  const browser = glanceTab.linkedBrowser;
  await TestUtils.waitForCondition(
    () =>
      browser.currentURI.spec === BEFOREUNLOAD_URL &&
      !browser.webProgress.isLoadingDocument,
    "Wait for the glance page to load"
  );
  return glanceTab;
}

// Requests a quit and answers the glance's beforeunload prompt, which is
// expected to be the only prompt. Returns whether the quit was canceled.
async function requestQuit(buttonNumClick) {
  let prompts = 0;
  const onPrompt = () => prompts++;
  Services.obs.addObserver(onPrompt, "common-dialog-loaded");
  const answered = PromptTestUtils.handleNextPrompt(
    window,
    {
      modalType: Ci.nsIPrompt.MODAL_TYPE_CONTENT,
      promptType: "confirmEx",
    },
    { buttonNumClick }
  );
  const cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].createInstance(
    Ci.nsISupportsPRBool
  );
  gZenGlanceManager.observe(cancelQuit, "quit-application-requested");
  await answered;
  Services.obs.removeObserver(onPrompt, "common-dialog-loaded");
  Assert.equal(prompts, 1, "The user should be asked only once");
  return cancelQuit.data;
}

add_task(async function test_Glance_Stay_On_Page_Cancels_Quit() {
  const parentTab = gBrowser.selectedTab;
  const glanceTab = await openBeforeUnloadGlance();

  ok(await requestQuit(1), "Staying on the page should cancel the quit");
  ok(glanceTab.isConnected, "The glance tab should still be open");
  Assert.equal(
    gZenGlanceManager.getTabOrGlanceParent(glanceTab),
    parentTab,
    "The glance should still be linked to its parent tab"
  );

  const otherTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );
  ok(
    !glanceTab.linkedBrowser
      .closest(".browserSidebarContainer")
      .classList.contains("deck-selected"),
    "Switching tabs should hide the glance"
  );

  await SpecialPowers.pushPrefEnv({
    set: [["dom.disable_beforeunload", true]],
  });
  gBrowser.selectedTab = parentTab;
  await gZenGlanceManager.closeGlance({ onTabClose: true });
  await SpecialPowers.popPrefEnv();
  BrowserTestUtils.removeTab(otherTab);
});

add_task(async function test_Glance_Leave_Page_Closes_Glance() {
  const glanceTab = await openBeforeUnloadGlance();

  ok(!(await requestQuit(0)), "Leaving the page should not cancel the quit");
  ok(!glanceTab.isConnected, "The glance tab should be closed");
});
