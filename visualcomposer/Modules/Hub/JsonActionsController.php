<?php

namespace VisualComposer\Modules\Hub;

if (!defined('ABSPATH')) {
    header('Status: 403 Forbidden');
    header('HTTP/1.1 403 Forbidden');
    exit;
}

use VisualComposer\Framework\Container;
use VisualComposer\Framework\Illuminate\Support\Module;
use VisualComposer\Helpers\Logger;
use VisualComposer\Helpers\Options;
use VisualComposer\Helpers\Request;
use VisualComposer\Helpers\Str;
use VisualComposer\Helpers\Traits\EventsFilters;

class JsonActionsController extends Container implements Module
{
    use EventsFilters;

    public function __construct()
    {
        $this->addFilter('vcv:hub:download:json', 'ajaxGetRequiredActions');
        $this->addFilter('vcv:ajax:hub:action:adminNonce', 'ajaxProcessAction');
        $this->addEvent('vcv:system:factory:reset', 'unsetOptions');
    }

    protected function ajaxGetRequiredActions(
        $response,
        $payload,
        Logger $loggerHelper
    ) {
        if (!vcIsBadResponse($response)) {
            if ($payload['json'] && !empty($payload['json']['actions'])) {
                $hubBundle = vchelper('HubBundle');
                $hubUpdateHelper = vchelper('HubUpdate');
                list($needUpdatePost, $requiredActions) = $hubBundle->loopActions($payload['json']);
                $reRenderPosts = array_unique($needUpdatePost);
                $response['actions'] = $requiredActions;
                if (count($reRenderPosts) > 0) {
                    $postsActions = $hubUpdateHelper->createPostUpdateObjects($reRenderPosts);
                    $response['actions'] = array_merge($response['actions'], $postsActions);
                }
            } else {
                $loggerHelper->log(
                    __('Failed to process required actions', 'vcwb') . ' #10056',
                    [
                        'payload' => $payload,
                        'response' => $response,
                    ]
                );
            }
        }

        return $response;
    }

    protected function ajaxProcessAction(
        $response,
        $payload,
        Request $requestHelper,
        Options $optionsHelper,
        Logger $loggerHelper,
        Str $strHelper
    ) {

        $requestAction = $requestHelper->input('vcv-hub-action');
        //if (!isset($action['key']) && isset($action['data'])) {
        //    $savedAction = $action;
        //} else {
        if (!isset($requestAction['key'])) {
            // TODO: Check HOW?!
            xdebug_break();
        }

        $newActionData = $optionsHelper->get('hubA:d:' . md5($requestAction['key']), false);
        $actionName = $newActionData['action'];

        $newActionVersion = $newActionData['version'];
        $previousActionVersion = $optionsHelper->get('hubAction:' . $actionName, '0');

        // FIX: For cases when hubElements wasnt updated but hubAction already exists
        if ($strHelper->contains($actionName, 'element/')) {
            $elements = vchelper('HubElements')->getElements();
            $elementTag = str_replace('element/', '', $actionName);
            if (!array_key_exists($elementTag, $elements)) {
                $previousActionVersion = '0.0.1'; // In case if element still not exists then try to download again
            }
        }

        if ($newActionVersion === $previousActionVersion) {
            sleep(5); // Just to avoid collisions

            return ['status' => true];
        }

        $locked = $this->checkForLock($optionsHelper);
        if ($locked) {
            // Collision avoid

            return ['status' => true];
        }
        if (!$newActionData) {
            // TODO: How?!
            $loggerHelper->log('The update action does not exists #10057');

            return ['status' => true];
        }

        $response = $this->processAction(
            $response,
            $newActionData['action'],
            $newActionData['data'],
            $newActionData['version'],
            isset($newActionData['checksum']) ? $newActionData['checksum'] : '',
            $newActionData['name']
        );

        return $response;
    }

    protected function processAction(
        $response,
        $action,
        $data,
        $version,
        $checksum,
        $name
    ) {
        $optionsHelper = vchelper('Options');
        $response = $this->triggerAction($response, $action, $data, $version, $checksum);
        if (is_array($response) && $response['status']) {
            $optionsHelper->set('hubAction:' . $action, $version);
        } else {
            $loggerHelper = vchelper('Logger');
            $loggerHelper->log(
                sprintf(__('Failed to download %1$s', 'vcwb') . ' #10058', esc_attr($name)),
                [
                    'version' => $version,
                    'action' => $action,
                    'data' => $data,
                    'checksum' => $checksum,
                ]
            );

            return false;
        }

        return $response;
    }

    protected function triggerAction($response, $action, $data, $version, $checksum)
    {
        $response = vcfilter(
            'vcv:hub:process:action:' . $action,
            $response,
            [
                'action' => $action,
                'data' => $data,
                'version' => $version,
                'checksum' => $checksum,
            ]
        );

        return $response;
    }

    protected function unsetOptions(Options $optionsHelper)
    {
        $optionsHelper->deleteTransient('vcv:activation:request');
        $optionsHelper->deleteTransient('vcv:hub:action:request');
        global $wpdb;
        $wpdb->query(
            $wpdb->prepare(
                'UPDATE ' . $wpdb->options
                . ' SET option_value="0.0.1" WHERE option_name LIKE "%s" AND NOT option_name = "%s"',
                VCV_PREFIX . 'hubAction:%',
                VCV_PREFIX . 'hubAction:updatePosts'
            )
        );
        $wpdb->query(
            $wpdb->prepare(
                'DELETE FROM ' . $wpdb->options . ' WHERE option_name LIKE "%s"',
                VCV_PREFIX . 'hubA:d:%'
            )
        );
        // Remove before 1.13 keys
        $wpdb->query(
            $wpdb->prepare(
                'DELETE FROM ' . $wpdb->options . ' WHERE option_name LIKE "%s"',
                VCV_PREFIX . 'hubAction:download:%'
            )
        );
    }

    /**
     * @param \VisualComposer\Helpers\Options $optionsHelper
     *
     * @return bool
     */
    protected function checkForLock(Options $optionsHelper)
    {
        $currentRequest = $optionsHelper->getTransient('vcv:hub:action:request');
        if ($currentRequest) {
            // We have parallel request
            for ($tries = 0; $tries < 3; $tries++) {
                sleep(10);
                $newRequest = $optionsHelper->getTransient('vcv:hub:action:request');
                if (!$newRequest || $currentRequest !== $newRequest) {
                    // Process completed, we can return result
                    break;
                }
            }

            return true;
        }
        $optionsHelper->setTransient('vcv:hub:action:request', time(), 60);

        return false;
    }
}
